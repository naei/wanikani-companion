window.onload = function() {
  
  var loopRequestId;

  // initialize the badge color
  chrome.browserAction.setBadgeBackgroundColor({color:'#ff00aa'}); 

  // check that there is a Chrome sync value
  chrome.storage.sync.get("wkUserData", function (obj) {
    if (obj.wkUserData === undefined){
      if (localStorage.wkUserData === undefined){
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
  function loopRequestUserData(notify = true) {
    var wkUserData = JSON.parse(localStorage.wkUserData);
    requestUserData(notify, function() {
      loopRequestId = window.setTimeout(loopRequestUserData, wkUserData.refreshInterval, true, true);
    });
  }

  function restartLoop(notify) {
    window.clearTimeout(loopRequestId);
    loopRequestId = loopRequestUserData(notify);
  }

  // when the update interval is changed, restart loopRequestUserData with the updated interval
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if ('wkUserData' in changes && loopRequestId !== undefined) {
      var oldValues = changes.wkUserData.oldValue;
      var newValues = changes.wkUserData.newValue;
      if (newValues.refreshInterval != oldValues.refreshInterval)
        restartLoop(true);
    }
  });

  // when a wanikani page is loaded, restart loopRequestUserData
  chrome.runtime.onMessage.addListener(function(request) {
      if (request === 'wkRestartLoop')
        restartLoop(false);
  });

  // disable 'X-Frame-Options' header to allow inlining pages within an iframe
  chrome.webRequest.onHeadersReceived.addListener(
      function(details) {
          var headers = details.responseHeaders;
          for (var i = 0; i < headers.length; ++i) { 
            if (headers[i].name == 'X-Frame-Options') {
                headers.splice(i, 1);
                break;
            }
          }
          return {responseHeaders: headers};
      },
      {
          urls: [ '*://*/*' ]
      },
      ['blocking', 'responseHeaders']
  );
}
