window.onload = function () {
  var loopRequestId;
  // initialize the badge color
  chrome.browserAction.setBadgeBackgroundColor({ color: "#ff00aa" });

  // check that there is a Chrome sync value
  chrome.storage.sync.get("wkUserData", function (obj) {
    if (obj.wkUserData === undefined) {
      if (localStorage.wkUserData === undefined) {
        // if a local storage does not exist, initialize it
        setWkUserData(new WkUserData());
      }
    } else {
      // get the existing user data from Chrome sync
      localStorage.wkUserData = JSON.stringify(obj.wkUserData);
    }
    loopRequestUserData();
  });

  // update data every x milliseconds
  function loopRequestUserData() {
    var wkUserData = JSON.parse(localStorage.wkUserData);
    requestUserData(true, function () {
      loopRequestId = window.setTimeout(
        loopRequestUserData,
        wkUserData.refreshInterval,
        true,
        true
      );
    });
  }

  // when the update interval is changed, restart loopRequestUserData with the updated interval
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if ("wkUserData" in changes && loopRequestId !== undefined) {
      var oldValues = changes.wkUserData.oldValue;
      var newValues = changes.wkUserData.newValue;
      if (newValues.refreshInterval != oldValues.refreshInterval) {
        window.clearTimeout(loopRequestId);
        loopRequestId = loopRequestUserData();
      }
    }
  });

  // disable headers in order to allow inlining pages within an iframe
  chrome.webRequest.onHeadersReceived.addListener(
    details => ({
      responseHeaders: details.responseHeaders.filter(header =>
          !['content-security-policy','x-frame-options'].includes(header.name.toLowerCase()))
    }),
    {
      urls: ['*://www.wanikani.com/*']
    },
    ['blocking', 'responseHeaders', 'extraHeaders']);
};
