
blockOnIncorrect = false;

document.addEventListener("keydown", event => {
  if (event.key === "Enter") {

    //block if block is set
    if (blockOnIncorrect) {
      event.stopImmediatePropagation();
    }
  }
});

window.onload = function () {

  chrome.storage.sync.get("wkUserData", function (obj) {
    // review & lessons quiz: auto-expand the "item info" panel
    if (obj.wkUserData.expandInfoPanel === true) {
      if (document.getElementById('reviews') != null || document.getElementById('lessons') != null) {
        var observer = new WebKitMutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.target.type === 'fieldset') {
              // wait and check that the panel is not already expanded before expanding it
              setTimeout(function () {
                if (document.getElementById('option-item-info').className != 'active') {
                  document.getElementById('option-item-info').click();
                }
              }, 200)
              return;
            }
          });
        });
        observer.observe(
          document.getElementById('answer-form'),
          {
            attributes: true,
            subtree: true
          }
        );
      }
    }

    // block progress for 3 seconds on incorrect answer
    if (obj.wkUserData.blockOnIncorrect === true) {
      if (document.getElementById('reviews') != null || document.getElementById('lessons') != null) {

        var observer = new WebKitMutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.target.type === 'fieldset') {
              // check the answer was incorrect
              if (document.getElementsByClassName('incorrect').length > 0) {
                blockOnIncorrect = true;
                setTimeout(function () {
                  // unset the block after 3 seconds
                  blockOnIncorrect = false;
                }, 3000)
              }
            }
          });
        });
        observer.observe(
          document.getElementById('answer-form'),
          {
            attributes: true,
            subtree: true
          }
        );
      }
    }
  });

  // hide the alert messages (ex: if the user is already logged)
  var isError = document.getElementsByClassName('alert alert-error fade in');
  if (isError.length == 1) {
    isError[0].style.display = 'none';
  }
}
