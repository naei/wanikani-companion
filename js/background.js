window.onload = function() {

	var loopRequestId;

	// initialize the badge color
	chrome.browserAction.setBadgeBackgroundColor({color:'#ff00aa'}); 

	// initialize the local storage if not exist
	if (localStorage.wkUserData === undefined){
		// check is there is a Chrome sync value
		chrome.storage.sync.get("wkUserData", function (obj) {
	  		if (obj.wkUserData === undefined){
	  			// create new unset user data
	  			setWkUserData(new WkUserData());
	  		} else {
	  			// get the existing user data from Chrome sync
	  			localStorage.wkUserData = obj.wkUserData;
	  		}
	  		loopRequestUserData();
		});
	} else {
		loopRequestUserData();
	}
	
	// update data every x milliseconds
	function loopRequestUserData(){
		var wkUserData = JSON.parse(localStorage.wkUserData);
		requestUserData(true, function(){
			loopRequestId = window.setTimeout(loopRequestUserData, wkUserData.refreshInterval, true, true);
		});
	}

	// when the update interval is changed, restart loopRequestUserData with the updated interval
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ('wkUserData' in changes && loopRequestId !== undefined) {
			var oldValues = JSON.parse(changes.wkUserData.oldValue);
			var newValues = JSON.parse(changes.wkUserData.newValue);
			if (newValues.refreshInterval != oldValues.refreshInterval) {
				window.clearTimeout(loopRequestId);
				loopRequestId = loopRequestUserData();
			}
		}
	});
}
