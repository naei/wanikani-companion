// initialize the local object for user data
function WkUserData() {
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
function setWkUserData(wkUserData, callback) {
  // save the data into the local storage
  localStorage.wkUserData = JSON.stringify(wkUserData);
  // ... and sync it with the current Chrome account
  chrome.storage.sync.set({ 'wkUserData': wkUserData });

  if (callback) callback();
}

// get the local user data as an object
function getWkUserData() {
  return JSON.parse(localStorage.wkUserData);
}

async function getApiv2Data(token, type) {

  return fetch(`https://api.wanikani.com/v2/${type}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.json())

}

// get a human readable value of the remaning time before the [reviewDate]
function parseRemainingTime(reviewDate) {
  if (reviewDate) {
    var now = moment();
    // var review = moment(new Date(new Date() * 1000));
    var review = moment(reviewDate)
    return review.from(now);
  }
  // [reviewDate] is null when the user hasn't done any lesson yet
  return null;
}

// update the local user data from the JSON data returned from the WaniKani API
function updateWkUserData(userData, currentLessonCount, currentReviewCount, nextReviewTime) {

  var wkUserData = JSON.parse(localStorage.wkUserData);

  wkUserData.username = userData.username;
  wkUserData.gravatar = "";
  wkUserData.level = userData.level;
  wkUserData.title = "Turtles"; // api v2 doesnt have that anymore

  if (currentLessonCount !== undefined && currentReviewCount !== undefined) {
    wkUserData.nbLessons = currentLessonCount;
    wkUserData.nbReviews = currentReviewCount;

    wkUserData.nextReview = parseRemainingTime(nextReviewTime);

  } else if (type == "srs-distribution") {
    wkUserData.srsNbApprentice = jsonUserData.requested_information.apprentice.total;
    wkUserData.srsNbGuru = jsonUserData.requested_information.guru.total;
    wkUserData.srsNbMaster = jsonUserData.requested_information.master.total;
    wkUserData.srsNbEnlighten = jsonUserData.requested_information.enlighten.total;
    wkUserData.srsNbBurned = jsonUserData.requested_information.burned.total;
  }

  setWkUserData(wkUserData);

}

// request the data to Wanikani API, display notifications and save local data
async function requestUserData(notify) {

  var currentData = getWkUserData();

  // update data and display notifications
  if (currentData.userPublicKey != "") {

    let userData = await getApiv2Data(currentData.userPublicKey, 'user');
    let summaryData = await getApiv2Data(currentData.userPublicKey, 'summary')

    let nbReviews = getCurrentReviewCount(summaryData);
    let nbLessons = getCurrentLessonCount(summaryData);
    let nextReviewTime = getNextReviewTime(summaryData);

    // display desktop notifications
    if (notify === true && currentData.refreshInterval != 0) {
      var notified = false;
      if (nbReviews > 0 && nbReviews != currentData.nbReviews) {
        createNotification("You have " + nbReviews + " reviews available.", "https://www.wanikani.com/review", "reviews");
        notified = true;
      }
      //if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
      if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
        createNotification("You have " + nbLessons + " lessons available.", "https://www.wanikani.com/lesson", "lessons");
        notified = true;
      }
      // play notification sound
      if (notified === true && currentData.notifSound === true) {
        var sound = new Audio('/snd/notification.mp3');
        sound.play();
      }
    }

    // update badge text and title
    var total = nbReviews + nbLessons;
    if (total == 0 && currentData.hide0Badge) {
      chrome.browserAction.setBadgeText({ text: "" });
    } else {
      chrome.browserAction.setBadgeText({ text: total.toString() });
    }
    chrome.browserAction.setTitle({ title: "WaniKani Companion\n" + "Lesson(s): " + nbLessons + "\n" + "Review(s): " + nbReviews });

    // save study data
    updateWkUserData(userData.data, nbLessons, nbReviews, nextReviewTime);
   
  }
}

// create a HTML notification
function createNotification(body, url, tag) {

  var notification = new Notification('WaniKani Companion', {
    icon: '/img/wanikani/icon.png',
    body: body,
    tag: tag
  });

  notification.onclick = function () {
    window.open(url);
  }

  // vanish the notifications after [notifLifetime] ms
  // if [notifLifetime] == -1, the notification stay until the user close it
  if (getWkUserData().notifLifetime != -1) {
    notification.onshow = function () {
      window.setTimeout(function () { notification.close() }, getWkUserData().notifLifetime);
    }
  }
}

function getCurrentLessonCount(summary) {
  if (summary.data.lessons) {
    let currentlyAvailableReviews = summary.data.lessons.filter((l) => new Date(l.available_at) < new Date())
    var currentlyAvailableReviewsCount = 0;
    currentlyAvailableReviews
      .forEach(lesson => {
        currentlyAvailableReviewsCount += lesson.subject_ids.length;
      });
    return currentlyAvailableReviewsCount;
  } else {
    return 0;
  }
}

function getCurrentReviewCount(summary) {
  if (summary.data.reviews) {
    let currentlyAvailableReviews = summary.data.reviews.filter((r) => new Date(r.available_at) < new Date())
    var currentlyAvailableReviewsCount = 0;
    currentlyAvailableReviews
      .forEach(review => {
        currentlyAvailableReviewsCount += review.subject_ids.length;
      });
    return currentlyAvailableReviewsCount;
  } else {
    return 0;
  }
}

function getNextReviewTime(summary) {
  if (summary.data.reviews) {
    var nextAvailableReviews = summary.data.reviews.filter((r) => new Date(r.available_at) > new Date());
    nextAvailableReviews.filter((r) => r.subject_ids.length);
    if (nextAvailableReviews.length > 0) {
      return new Date(nextAvailableReviews[0].available_at);
    }
    return undefined;
  } else {
    return undefined;
  }
}
