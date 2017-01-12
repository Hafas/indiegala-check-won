// ==UserScript==
// @name         IndieGala: Check giveaways if won
// @version      1.0.0
// @description  Check won giveaways the fast & convenient way
// @author       Hafas (https://github.com/Hafas/)
// @match        https://www.indiegala.com/profile*
// @grant        none
// ==/UserScript==
(function () {
  var $completedTab = $(".giveaway-completed").parent();
  $completedTab.prepend("<button/>");
  var $myButton = $("button", $completedTab).first();
  activateButton();
  $myButton.on("click", function () {
    var summary = {
      entries : 0,
      blanks: 0,
      wins: 0
    };
    deactivateButton();
    (function checkPage () {
      return getCompleted().then(function (payload) {
        var html = payload.html;
        var entryIds = getEntryIds(html);
        //update the inner DOM
        $(".giveaways-list-cont", $completedTab).html(html);
        if (entryIds.length === 0) {
          conclude(summary);
          activateButton();
        } else {
          return checkAllIfWon(entryIds).then(updateSummary(summary)).then(checkPage);
        }
      });
    })();
  });

  function activateButton () {
    $myButton.html("Check all if won");
    $myButton.css({
      background: "#CC001D",
      color: "white",
      float: "right",
      marginLeft: "2px",
      padding: "9px"
    });
    $myButton.attr("disabled", false);
  }

  function deactivateButton () {
    $myButton.html("Checking ...");
    $myButton.css({background: "#999"});
    $myButton.attr("disabled", true);
  }

  function getCompleted () {
    return $.ajax({
      url: "/giveaways/library_completed",
      dataType: "json"
    }, function (error) {
      //retry
      return $.Deferred(function (d) {
        setTimeout(function () {
          d.resolve();
        }, 1000);
      });
    });
  }

  function getEntryIds (html) {
    return $(".winner-ticket-cont input", $(html)).map(function (i, input) {
      return input.value;
    }).toArray();
  }

  function checkAllIfWon (entryIds) {
    return $.when.apply($, entryIds.map(checkIfWon));
  }

  function checkIfWon (entryId) {
    return $.ajax({
      type: "POST",
      url: "/giveaways/check_if_won",
      dataType: "json",
      data: JSON.stringify({
        entry_id: entryId
      })
    }).then(function (payload) {
      console.log(entryId, payload);
      return payload;
    }, function () {
      //resolve errors. They'll be rechecked later.
      return $.Deferred.resolve({error: true});
    });
  }

  function updateSummary (summary) {
    return function () {
      for (var i = 0; i < arguments.length; ++i) {
        var payload = arguments[i];
        //errors can be ignored - the will be retried on the next page
        if (!payload.error) {
          var isWin = payload.is_winner;
          if (isWin === "true") {
            summary.entries++;
            summary.wins++;
          } else if (isWin === "false") {
            summary.entries++;
            summary.blanks++;
          } else {
            console.error("unexpected response:", isWin);
          }
        }
      }
    };
  }

  function conclude (summary) {
    alert("IG Check Won: " + summary.entries + " entries checked. " + summary.wins + " wins. " + summary.blanks + " blanks.");
  }
})();
