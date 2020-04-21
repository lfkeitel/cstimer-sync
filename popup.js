var csTimerUrlPatterns = [
  "*://*.cstimer.net/timer.php",
  "*://*.cstimer.net/timer.php?*",
  "*://cstimer.net/*",
];

var numberOfcsTimerSessions;
// Chrome stopped complaining at 7400, but I figured having a 100 byte headroom isn't bad
var itemStorageLimit = 7300;

var dataKeys = ["cts-props", "cts-save-time", "sessions"];

function renderStatus(message) {
  document.getElementById("status").innerHTML = message;
}

function setErrorMessage(message) {
  document.getElementById("errorMsg").innerHTML = message;
}

function clearErrorMessage() {
  setErrorMessage("");
}

function startTabScript() {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
      url: csTimerUrlPatterns,
    },
    function (tabs) {
      if (tabs.length) {
        var tab = tabs[0];
        chrome.tabs.executeScript(tab.id, {
          file: "injection.js",
        });
      }
    }
  );
}

function sendTabMessage(action, data) {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
      url: csTimerUrlPatterns,
    },
    function (tabs) {
      if (tabs.length) {
        var tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {
          action,
          data,
        });
      }
    }
  );
}

function getDataFromSite() {
  renderStatus("Retrieving sessions...");
  sendTabMessage("save");
}

function sendDataToSite(data) {
  renderStatus("Loading sessions...");
  sendTabMessage("load", data);
}

function saveDataToSyncedStorage(data) {
  clearErrorMessage();
  // data = {cts-props: ..., cts-sess[1-N]: ....}
  preparedData = prepareDataForStorage(data);
  console.dir(preparedData);
  var d = new Date();
  preparedData["cts-save-time"] = d.toLocaleString();

  chrome.storage.sync.set(preparedData, function () {
    if (chrome.runtime.lastError) {
      renderStatus("Error saving data");
      setErrorMessage(chrome.runtime.lastError.message);
    } else {
      renderStatus(
        "Data saved (" + preparedData.sessions.length + " sessions)"
      );
    }
  });
}

function prepareDataForStorage(data) {
  var partedData = {};
  partedData.sessions = [];
  // Do nothing with the properties
  partedData["cts-props"] = data["cts-props"];

  // Go over each session and break it into manageable and saveable chunks
  for (const sessionName in data.sessions) {
    var sessionParts = {};
    var sessionString = data.sessions[sessionName];
    var numOfParts = 0;

    if (sessionString !== "[]") {
      // Determine number of parts
      if (sessionString.length > itemStorageLimit) {
        var lengthRemainder = sessionString.length % itemStorageLimit;
        numOfParts =
          (sessionString.length - lengthRemainder) / itemStorageLimit;

        if (lengthRemainder) {
          numOfParts += 1;
        }
      } else {
        numOfParts = 1;
      }

      // Break up string into x parts
      for (var j = 1; j <= numOfParts; j++) {
        sessionParts[sessionName + "-" + j] = sessionString.substring(
          (j - 1) * itemStorageLimit,
          j * itemStorageLimit
        );
      }

      // Save metadata about session
      sessionParts[sessionName + "-0"] = {
        parts: numOfParts,
      };
    } else {
      // If the string is "[]" then it's empty, no point in wasting ~14 bytes
      sessionParts[sessionName + "-0"] = {
        parts: 0,
      };
    }

    partedData = mergeObjects(partedData, sessionParts);
    partedData.sessions.push(sessionName);
  }

  return partedData;
}

function mergeObjects(base, additional) {
  for (var attr in additional) {
    base[attr] = additional[attr];
  }
  return base;
}

function loadDataFromSyncedStorage() {
  // TODO: Refactor this function into smaller functions
  clearErrorMessage();
  // The first storage get gets the properties, and last saved time
  chrome.storage.sync.get(dataKeys, function (data) {
    if (!data["cts-save-time"]) {
      return;
    }

    var loadedData = {
      "cts-props": data["cts-props"],
      "cts-save-time": data["cts-save-time"],
      sessions: {},
    };

    var sessionKeys = [];
    sessionNames = data.sessions;

    sessionKeys = sessionNames.map((item) => item + "-0");

    // This gets the session metadata given the number of sessions in the properties
    chrome.storage.sync.get(sessionKeys, function (sessionData) {
      var sessionPartsToGet = [];
      var sessionsToSplice = [];
      // Loop through session to see for which ones we need to get data
      for (const name of sessionNames) {
        var parts = sessionData[name + "-0"].parts;
        if (parts > 0) {
          for (var j = 1; j <= parts; j++) {
            sessionPartsToGet.push(name + "-" + j);
          }
          sessionsToSplice.push([name, parts]);
        }
      }

      // This gets the session parts as determined by the above for loop
      chrome.storage.sync.get(sessionPartsToGet, function (sessParts) {
        for (var i = 0; i < sessionsToSplice.length; i++) {
          var sessionID = sessionsToSplice[i][0];
          var parts = sessionsToSplice[i][1];
          var splicedString = "";

          // Splice everything back together
          for (var j = 1; j <= parts; j++) {
            splicedString += sessParts[sessionID + "-" + j];
          }

          loadedData.sessions[sessionID] = splicedString;
        }

        // Load the newly spliced data
        sendDataToSite(loadedData);
      });
    });
  });
}

function displaySavedDataExists() {
  clearErrorMessage();
  chrome.storage.sync.get(dataKeys, function (data) {
    if (data["cts-save-time"]) {
      renderStatus("<br>Last saved on " + data["cts-save-time"]);
    } else {
      renderStatus("No data");
    }
  });
}

function clearDataFromSyncedStorage() {
  chrome.storage.sync.clear();
  renderStatus("Data cleared");
}

function loadedAction(data) {
  renderStatus(`Loaded ${data} sessions`);
}

(function () {
  document.getElementById("saveBtn").addEventListener("click", getDataFromSite);
  document
    .getElementById("loadBtn")
    .addEventListener("click", loadDataFromSyncedStorage);
  document
    .getElementById("removeBtn")
    .addEventListener("click", clearDataFromSyncedStorage);

  // When getting the data from csTimer, it's sent in a message
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    switch (request.action) {
      case "sessionData":
        saveDataToSyncedStorage(request.data);
      case "loaded":
        loadedAction(request.data);
    }
  });

  startTabScript();
  displaySavedDataExists();
})();
