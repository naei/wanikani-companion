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
  this.emailAddress = "";
  this.gravatar = "";
  this.level = "42";
  this.nbLessons = 0;
  this.nbReviews = 0;
  this.srsNbApprentice = 0;
  this.srsNbGuru = 0;
  this.srsNbMaster = 0;
  this.srsNbEnlighten = 0;
  this.srsNbBurned = 0;
  this.assignmentsLastModified = null;
  this.summaryLastModified = null;
}

// save the local user data
function setWkUserData(wkUserData, callback) {
  // save the data into the local storage
  localStorage.wkUserData = JSON.stringify(wkUserData);
  // ... and sync it with the current Chrome account
  chrome.storage.sync.set({ wkUserData: wkUserData });

  if (callback) callback();
}

// get the local user data as an object
function getWkUserData() {
  return JSON.parse(localStorage.wkUserData);
}

// get the user data via the WaniKani API
function getApiData(publicKey, type, callback) {
  var xhr = new XMLHttpRequest();

  const modifiedDate =
    type === "user"
      ? null
      : type === "summary"
      ? "summaryLastModified"
      : "assignmentsLastModified";
  xhr.open("GET", `https://api.wanikani.com/v2/${type}`, true);
  xhr.setRequestHeader("Authorization", `Bearer ${publicKey}`);
  xhr.setRequestHeader("Cache-Control", "no-cache");
  if (modifiedDate && JSON.parse(localStorage.wkUserData)[modifiedDate]) {
    xhr.setRequestHeader(
      "If-Modified-Since",
      moment(JSON.parse(localStorage.wkUserData)[modifiedDate]).format(
        "ddd, DD MMM YYYY HH:mm:ss [GMT]"
      )
    );
  }
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      const response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      callback(response);
    }
  };
  xhr.send();
}

function fetchAssignmentsLoop(
  publicKey,
  callback,
  assignments = [],
  nextUrl = ""
) {
  getApiData(publicKey, `assignments?hidden=false${nextUrl}`, function (
    responseData
  ) {
    if (!responseData.data) return null;
    const nextAssignments = assignments.concat(responseData.data);
    if (responseData.pages.next_url) {
      const nextUrlId = responseData.data[responseData.data.length - 1].id;
      fetchAssignmentsLoop(
        publicKey,
        callback,
        nextAssignments,
        `&page_after_id=${nextUrlId}`
      );
    } else {
      const srsDistributionOfAssignments = {
        apprentice: 0,
        guru: 0,
        master: 0,
        enlighten: 0,
        burned: 0,
        assignmentsLastModified: responseData.data_updated_at,
      };
      nextAssignments.forEach(assignment => {
        const srsStage = assignment.data.srs_stage;
        if (srsStage > 0 && srsStage <= 4) {
          srsDistributionOfAssignments.apprentice += 1;
        } else if (srsStage > 4 && srsStage <= 6) {
          srsDistributionOfAssignments.guru += 1;
        } else if (srsStage == 7) {
          srsDistributionOfAssignments.master += 1;
        } else if (srsStage == 8) {
          srsDistributionOfAssignments.enlighten += 1;
        } else if (srsStage == 9) {
          srsDistributionOfAssignments.burned += 1;
        }
      });
      updateWkUserData(
        srsDistributionOfAssignments,
        "srs-distribution",
        function () {
          if (callback) callback();
        }
      );
      // return srsDistributionOfAssignments;
    }
  });
}

// get a human readable value of the remaning time before the [reviewDate]
function parseRemainingTime(reviewDate) {
  if (reviewDate) {
    var now = moment();
    var review = moment(reviewDate);
    return review.from(now);
  }
  // [reviewDate] is null when the user hasn't done any lesson yet
  return null;
}

// update the local user data from the JSON data returned from the WaniKani API
function updateWkUserData(jsonUserData, type, callback) {
  var wkUserData = JSON.parse(localStorage.wkUserData);

  if (type == "summary" && jsonUserData.data) {
    wkUserData.nbLessons = jsonUserData.data.lessons[0].subject_ids.length;
    const nextReviews = jsonUserData.data.reviews.find(
      rev => rev.subject_ids.length > 0
    );
    wkUserData.nbReviews = nextReviews ? nextReviews.subject_ids.length : 0;
    wkUserData.nextReview = parseRemainingTime(
      jsonUserData.data.next_reviews_at
    );
    wkUserData.summaryLastModified = jsonUserData.data_updated_at;
  } else if (type == "srs-distribution" && jsonUserData) {
    wkUserData.srsNbApprentice = jsonUserData.apprentice;
    wkUserData.srsNbGuru = jsonUserData.guru;
    wkUserData.srsNbMaster = jsonUserData.master;
    wkUserData.srsNbEnlighten = jsonUserData.enlighten;
    wkUserData.srsNbBurned = jsonUserData.burned;
    wkUserData.assignmentsLastModified = jsonUserData.assignmentsLastModified;
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
    getApiData(currentData.userPublicKey, "summary", function (userData) {
      const nextReviews = userData.data
        ? userData.data.reviews.find(rev => rev.subject_ids.length > 0)
        : null;
      var nbLessons = userData.data
        ? userData.data.lessons[0].subject_ids.length
        : currentData.nbLessons;
      var nbReviews = userData.data
        ? nextReviews
          ? nextReviews.subject_ids.length
          : 0
        : currentData.nbReviews;

      // display desktop notifications
      if (notify === true && currentData.refreshInterval != 0) {
        var notified = false;
        if (nbReviews > 0 && nbReviews != currentData.nbReviews) {
          createNotification(
            "You have " + nbReviews + " reviews available.",
            "https://www.wanikani.com/review",
            "reviews"
          );
          notified = true;
        }
        //if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
        if (nbLessons > 0 && nbLessons != currentData.nbLessons) {
          createNotification(
            "You have " + nbLessons + " lessons available.",
            "https://www.wanikani.com/lesson",
            "lessons"
          );
          notified = true;
        }
        // play notification sound
        if (notified === true && currentData.notifSound === true) {
          var sound = new Audio("/snd/notification.mp3");
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
      chrome.browserAction.setTitle({
        title:
          "WaniKani Companion\n" +
          "Lesson(s): " +
          nbLessons +
          "\n" +
          "Review(s): " +
          nbReviews,
      });

      // save study data
      updateWkUserData(userData, "summary", function () {
        fetchAssignmentsLoop(currentData.userPublicKey, callback);
      });
    });
  }
}

// create a HTML notification
function createNotification(body, url, tag) {
  var notification = new Notification("WaniKani Companion", {
    icon: "/img/wanikani/icon.png",
    body: body,
    tag: tag,
  });

  notification.onclick = function () {
    window.open(url);
  };

  // vanish the notifications after [notifLifetime] ms
  // if [notifLifetime] == -1, the notification stay until the user close it
  if (getWkUserData().notifLifetime != -1) {
    notification.onshow = function () {
      window.setTimeout(function () {
        notification.close();
      }, getWkUserData().notifLifetime);
    };
  }
}
