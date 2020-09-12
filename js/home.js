window.onload = function() {

  var wkUserData = JSON.parse(localStorage.wkUserData);
  fullfillUserData();

  // display info message if the user is coming for the first time
  if (wkUserData.userPublicKey === undefined || wkUserData.userPublicKey == ""){
    document.querySelector(".info").style.display = 'inline';
  } else {
     // reload user data
    requestUserData(false, function() {
      wkUserData = JSON.parse(localStorage.wkUserData);
      fullfillUserData();
    });
  }

  // display Gravatar image (if exist)
  var xhr = new XMLHttpRequest();
  if(wkUserData.gravatar != ""){
    xhr.open("GET", 'http://www.gravatar.com/avatar/' + wkUserData.gravatar + '?d=404', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          document.getElementById('gravatar').src = 'http://www.gravatar.com/avatar/' + wkUserData.gravatar;
        }
      }
    }
    xhr.send();
  }

  // when the user click on a link, it redirect the url to the web-container page or a new Chrome tab (depends on user settings)
  var inApp = wkUserData.inAppNavigation;
  document.getElementById('toLessons').onclick = function() {
    var url = "https://www.wanikani.com/lesson/session"
    if (inApp){
      localStorage.toLink = url;
    } else {
      chrome.tabs.create({ url: url });
    }
  }
  document.getElementById('toReviews').onclick = function() {
    var url = "https://www.wanikani.com/review/session";
    if (inApp){
     localStorage.toLink = url;
    } else {
     chrome.tabs.create({ url: url });
    }
  }
  document.getElementById('toDashboard').onclick = function() {
     var url = "https://www.wanikani.com/login";
     if (inApp){
       localStorage.toLink = url;
     } else {
       chrome.tabs.create({ url: url });
     }
  }

  // fullfill user data
  function fullfillUserData(){

     document.getElementById('username').innerHTML = wkUserData.username;
     document.getElementById('level').innerHTML = wkUserData.level;
     document.getElementById('title').innerHTML = wkUserData.title;
     document.getElementById('nbLessons').innerHTML = wkUserData.nbLessons;
     document.getElementById('nbReviews').innerHTML = wkUserData.nbReviews;
     document.getElementById('reviewTime').innerHTML = wkUserData.nextReview;
     document.getElementById('srsNbApprentice').innerHTML = wkUserData.srsNbApprentice;
     document.getElementById('srsNbGuru').innerHTML = wkUserData.srsNbGuru;
     document.getElementById('srsNbMaster').innerHTML = wkUserData.srsNbMaster;
     document.getElementById('srsNbEnlighten').innerHTML = wkUserData.srsNbEnlighten;
     document.getElementById('srsNbBurned').innerHTML = wkUserData.srsNbBurned;

     if (wkUserData.nbReviews > 0 || !wkUserData.nextReview){
         // the user has reviews, or does not have next reviews
         document.querySelector("#reviews").style.display = 'block';
         document.querySelector("#nextReviews").style.display = 'none';
     } else {
         // the user does not have available reviews, display when will be the next one
         document.querySelector("#reviews").style.display = 'none';
         document.querySelector("#nextReviews").style.display = 'block';
     }
  }
}
