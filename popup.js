var csTimerUrlPatterns = [
    "*://*.cstimer.net/timer.php",
    "*://*.cstimer.net/timer.php?*",
    "*://cstimer.net/timer.php",
    "*://cstimer.net/timer.php?*"
];

var numberOfcsTimerSessions = 15;
// Chrome stopped complaining at 7400, but I figured having a 100 byte headroom isn't bad
var itemStorageLimit = 7300;

var dataKeys = [
    "cts-props",
    "cts-sess1-0",
    "cts-sess2-0",
    "cts-sess3-0",
    "cts-sess4-0",
    "cts-sess5-0",
    "cts-sess6-0",
    "cts-sess7-0",
    "cts-sess8-0",
    "cts-sess9-0",
    "cts-sess10-0",
    "cts-sess11-0",
    "cts-sess12-0",
    "cts-sess13-0",
    "cts-sess14-0",
    "cts-sess15-0",
    "cts-save-time"
];

function renderStatus(message) {
    document.getElementById("status").innerHTML = message;
}

function setErrorMessage(message) {
    document.getElementById("errorMsg").innerHTML = message;
}

function clearErrorMessage() {
    setErrorMessage('');
}

function getLocalStorage() {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: csTimerUrlPatterns
    }, function(tabs) {
        if (tabs.length) {
            var tab = tabs[0];
            chrome.tabs.executeScript(tab.id, {
                file: 'injection.js'
            });
        }
    });
}

function saveToLocalStorage(data) {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: csTimerUrlPatterns
    }, function(tabs) {
        if (tabs.length) {
            var tab = tabs[0];
            var code = '';

            // Sets the session select element to session 15
            // An updated localStorage value won't take affect if
            // the session is currently selected. I figure session 15
            // would rarely be used and is safe to basically ignore.
            // A maybe better option would be to create a session "16" and use
            // that as the temporary option. I don't know how csTimer would react to it
            code += "var element = document.getElementsByTagName('select')[2];";
            code += "element.value = '15';";
            code += "var evt = document.createEvent('HTMLEvents');";
            code += "evt.initEvent('change', false, true);";
            code += "element.dispatchEvent(evt);";

            code += 'localStorage.setItem("properties", '+JSON.stringify(data['cts-props'])+');';
            code += 'localStorage.setItem("cts-save-time", "'+data['cts-save-time']+'");';

            // Currently there are 15 sessions
            for (var i = 1; i <= numberOfcsTimerSessions; i++) {
                if (typeof data['cts-sess'+i] !== "undefined") {
                    code += 'localStorage.setItem("session'+i+'", JSON.stringify('+data['cts-sess'+i]+'));';
                }
            }

            code += "location.reload();";

            chrome.tabs.executeScript(tab.id, {
                code: code
            }, function() {
                renderStatus('Data loaded');
                window.close();
            });
        }
    });
}

function saveDataToSyncedStorage(data) {
    clearErrorMessage();
    // data = {cts-props: ..., cts-sess[1-15]: ....}
    preparedData = prepareDataForStorage(data);
    var d = new Date();
    preparedData["cts-save-time"] = d.toLocaleString();

    chrome.storage.sync.set(preparedData, function() {
        if (chrome.runtime.lastError) {
            renderStatus("Error saving data");
            setErrorMessage(chrome.runtime.lastError.message);
        } else {
            renderStatus("Data saved");
        }
    });
}

function prepareDataForStorage(data) {
    var partedData = {};
    // Do nothing with the properties
    partedData["cts-props"] = data["cts-props"];

    // Go over each session and break it into manageable (and hopefully saveable) chunks
    for (var i = 1; i <= numberOfcsTimerSessions; i++) {
        var sessionName = "cts-sess"+i;
        var sessionParts = {};
        var sessionString = data[sessionName];
        var numOfParts = 0;

        if (sessionString !== "[]") {
            // Determine number of parts
            if (sessionString.length > itemStorageLimit) {
                var lengthRemainder = sessionString.length % itemStorageLimit;
                numOfParts = (sessionString.length - lengthRemainder) / itemStorageLimit;

                if (lengthRemainder) {
                    numOfParts += 1;
                }
            } else {
                numOfParts = 1;
            }

            // Break up string into x parts
            for (var j = 1; j <= numOfParts; j++) {
                sessionParts[sessionName+"-"+j] = sessionString.substring((j-1)*itemStorageLimit, (j*itemStorageLimit));
            }

            // Save metadata about session
            sessionParts[sessionName+"-0"] = {
                parts: numOfParts
            };
        } else {
            // If the string is "[]" then it's empty, no point in wasting ~14 bytes
            sessionParts[sessionName+"-0"] = {
                parts: 0
            };
        }

        partedData = mergeObjects(partedData, sessionParts);
    }

    return partedData;
}

function mergeObjects(base, additional) {
    for (var attr in additional) {
        base[attr] = additional[attr];
    }
    return base;
}

function getDataFromSyncedStorage() {
    clearErrorMessage();
    // The first storage get gets the session metadata, properties, and last saved time
    chrome.storage.sync.get(dataKeys, function(data) {
        if (data["cts-save-time"]) {
            var loadedData = {
                "cts-props": data["cts-props"],
                "cts-save-time": data["cts-save-time"]
            };

            var sessionPartsToGet = [];
            var sessionsToSplice = [];
            // Loop through session to see for which ones we need to get data
            for (var i = 1; i <= numberOfcsTimerSessions; i++) {
                var parts = data["cts-sess"+i+"-0"].parts;
                if (parts > 0) {
                    for (var j = 1; j <= parts; j++) {
                        sessionPartsToGet.push("cts-sess"+i+"-"+j);
                    }
                    sessionsToSplice.push([i, parts]);
                }
            }

            // This gets the session parts as determined by the above for loop
            chrome.storage.sync.get(sessionPartsToGet, function(sessParts) {
                for (var i = 0; i < sessionsToSplice.length; i++) {
                    var sessionID = sessionsToSplice[i][0];
                    var parts = sessionsToSplice[i][1];
                    var splicedString = "";

                    // Splice everything back together
                    for (var j = 1; j <= parts; j++) {
                        splicedString += sessParts["cts-sess"+sessionID+"-"+j];
                    }

                    loadedData["cts-sess"+sessionID] = splicedString;
                }

                // Load the newly spliced data
                saveToLocalStorage(loadedData);
            });
        }
    });
}

function displaySavedDataExists() {
    clearErrorMessage();
    chrome.storage.sync.get(dataKeys, function(data) {
        if (data["cts-save-time"]) {
            renderStatus('<br>Last saved on '+data["cts-save-time"]);
        } else {
            renderStatus("No data");
        }
    });
}

function clearDataFromSyncedStorage() {
    chrome.storage.sync.clear();
    renderStatus("Data cleared");
}

(function() {
    document.getElementById("saveBtn").addEventListener("click", getLocalStorage);
    document.getElementById("loadBtn").addEventListener("click", getDataFromSyncedStorage);
    document.getElementById("removeBtn").addEventListener("click", clearDataFromSyncedStorage);

    // When getting the data from csTimer, it's sent in a message
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            saveDataToSyncedStorage(request);
        }
    );

    displaySavedDataExists();
})();
