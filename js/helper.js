// initialize the local object for user data
function WkUserData(){
  this.userPublicKey = "";
  this.refreshInterval = 900000;
  this.notifLifetime = 10000;
  this.inAppNavigation = true;
  this.expandInfoPanel = true;
  this.hide0Badge = false;
  this.notifSound = false;

  this.username = "Mysterious Unknown";
  this.gravatar = "";
  this.level = "42";
  this.title = "Legend";
  this.nbLessons = 0;
  this.nbReviews = 0;
  this.srsNbApprentice = 0;
  this.srsNbGuru = 0;
  this.srsNbMaster = 0;
  this.srsNbEnlighten = 0;
  this.srsNbBurned = 0;
}

// save the local user data
function setWkUserData(wkUserData, callback){
  // save the data into the local storage
  localStorage.wkUserData = JSON.stringify(wkUserData);
  // ... and sync it with the current Chrome account
  chrome.storage.sync.set({'wkUserData': wkUserData});

  if (callback) callback();
}

// get the local user data as an object
function getWkUserData(){
  return JSON.parse(localStorage.wkUserData);
}

// get the user data via the WaniKani API
function getApiData(publicKey, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://www.wanikani.com/api/user/" + publicKey + "/" + type, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send();
}

// get a human readable value of the remaning time before the [reviewDate]
function parseRemainingTime(reviewDate) {
  if (reviewDate){
    var now = moment();
    var review = moment(new Date(reviewDate*1000));
    return review.from(now);
  }
  // [reviewDate] is null when the user hasn't done any lesson yet
  return null;
}

// update the local user data from the JSON data returned from the WaniKani API
function updateWkUserData(jsonUserData, type, callback){

  var wkUserData = JSON.parse(localStorage.wkUserData);

  wkUserData.username = jsonUserData.user_information.username;
  wkUserData.gravatar = jsonUserData.user_information.gravatar;
  wkUserData.level = jsonUserData.user_information.level;
  wkUserData.title = jsonUserData.user_information.title;

  if (type == "study-queue") {
    wkUserData.nbLessons = jsonUserData.requested_information.lessons_available;
    wkUserData.nbReviews = jsonUserData.requested_information.reviews_available;
    wkUserData.nextReview = parseRemainingTime(jsonUserData.requested_information.next_review_date);

  } else if (type == "srs-distribution") {
    wkUserData.srsNbApprentice = jsonUserData.requested_information.apprentice.total;
    wkUserData.srsNbGuru = jsonUserData.requested_information.guru.total;
    wkUserData.srsNbMaster = jsonUserData.requested_information.master.total;
    wkUserData.srsNbEnlighten = jsonUserData.requested_information.enlighten.total;
    wkUserData.srsNbBurned = jsonUserData.requested_information.burned.total;
  }

  setWkUserData(wkUserData);

  if (callback) callback();
}

// request the data to Wanikani API, display notifications and save local data
function requestUserData(notify, callback) {

  var currentData = getWkUserData();

  // update data and display notifications
  if (currentData.userPublicKey != "") {

    // get lessons and reviews data
    getApiData(currentData.userPublicKey, "study-queue", function(userData){

      var nbReviews = userData.requested_information.reviews_available;
      var nbLessons = userData.requested_information.lessons_available;

      // display desktop notifications
      if (notify === true && currentData.refreshInterval != 0){
          var notified = false;
          if (nbReviews > 0 && nbReviews != currentData.nbReviews) {
            createNotification("You have " + nbReviews +" reviews available.", "https://www.wanikani.com/review", "reviews");
            notified = true;
          }
          //if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
          if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
            createNotification("You have " + nbLessons +" lessons available.", "https://www.wanikani.com/lesson", "lessons");
            notified = true;
          }
          // play notification sound
          if (notified === true && currentData.notifSound === true){
            var sound = new Audio('/snd/notification.mp3');
            sound.play();
          }
      }

      // update badge text and title
      var total = nbReviews+nbLessons;
      if (total == 0 && currentData.hide0Badge) {
        chrome.browserAction.setBadgeText({text:""});
      } else {
        chrome.browserAction.setBadgeText({text:total.toString()});
      }
      chrome.browserAction.setTitle({title: "WaniKani Companion\n" + "Lesson(s): " + nbLessons + "\n" + "Review(s): " + nbReviews});
      
      // save study data
      updateWkUserData(userData, "study-queue", function(){
        // get the srs distribution data
        getApiData(currentData.userPublicKey, "srs-distribution" ,function(userData){
          // save srs distribution data
          updateWkUserData(userData, "srs-distribution", function(){ if (callback) callback(); });
        });
      });

    });
  }
}

// create a HTML notification
function createNotification(body, url, tag){

  var notification = new Notification('WaniKani Companion', {
    icon: '/img/wanikani/icon.png',
    body: body,
    tag: tag
  });

  notification.onclick = function() {
    window.open(url);
  }

  // vanish the notifications after [notifLifetime] ms
  // if [notifLifetime] == -1, the notification stay until the user close it
  if (getWkUserData().notifLifetime != -1) {
    notification.onshow = function() {
      window.setTimeout(function() { notification.close() }, getWkUserData().notifLifetime);
    }
  }
}
