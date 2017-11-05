window.onload = function() {

  var wkUserData = getWkUserData();

  // display current settings
  document.getElementById('apiKey').value = wkUserData.userPublicKey;
  document.getElementById('refreshInterval').value = wkUserData.refreshInterval;
  document.getElementById('notifLifetime').value = wkUserData.notifLifetime;
  document.getElementById('notifSound').checked = wkUserData.notifSound == true ? true : false;
  document.getElementById('inAppNav').checked = wkUserData.inAppNavigation == true ? true : false;
  document.getElementById('expandInfoPanel').checked = wkUserData.expandInfoPanel == true ? true : false;
  document.getElementById('hide0Badge').checked = wkUserData.hide0Badge == true ? true : false;

  // action when LINK to WaniKani is clicked
  document.getElementById('link').onclick = function() {
    window.open('https://www.wanikani.com/settings/account#public-api-key')
  }

  // action when settings are saved
  document.getElementById('save').onclick = function() {

    document.querySelector(".error").style.display = 'none';
    document.querySelector(".info").style.display = 'inline';

    var key = document.getElementById('apiKey').value;

    // the key is empty or didn't change: do not save
    if (key == "" || key == wkUserData.userPublicKey) {

      wkUserData.refreshInterval = document.getElementById('refreshInterval').value;
      wkUserData.notifLifetime = document.getElementById('notifLifetime').value;
      wkUserData.notifSound = (document.getElementById('notifSound').checked) ? true : false;
      wkUserData.inAppNavigation = (document.getElementById('inAppNav').checked) ? true : false;
      wkUserData.expandInfoPanel = (document.getElementById('expandInfoPanel').checked) ? true : false;
      wkUserData.hide0Badge = (document.getElementById('hide0Badge').checked) ? true : false;

      setWkUserData(wkUserData, function() {
        window.location.replace("/html/home.html");
      });

    // a new key has been entered: save
    } else if (key != wkUserData.userPublicKey){

      getApiData(key, "user-information", function(obj){

        // the key is not valid
        if (obj.user_information === undefined){
          document.querySelector(".error").style.display = 'inline';
          document.querySelector(".info").style.display = 'none';

        // the key is valid
        } else {
          wkUserData.userPublicKey = document.getElementById('apiKey').value;
          wkUserData.refreshInterval = document.getElementById('refreshInterval').value;
          wkUserData.notifLifetime = document.getElementById('notifLifetime').value;
          wkUserData.notifSound = (document.getElementById('notifSound').checked) ? true : false;
          wkUserData.inAppNavigation = (document.getElementById('inAppNav').checked) ? true : false;
          wkUserData.expandInfoPanel = (document.getElementById('expandInfoPanel').checked) ? true : false;
          wkUserData.hide0Badge = (document.getElementById('hide0Badge').checked) ? true : false;

          setWkUserData(wkUserData, function() {
            requestUserData(false, function(){
              window.location.replace("/html/home.html");
            });
          });
        }
      });
    }
  }
}
