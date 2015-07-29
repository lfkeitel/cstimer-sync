var csTimerUrlPatterns = [
    "*://*.cstimer.net/timer.php",
    "*://*.cstimer.net/timer.php?*",
    "*://cstimer.net/timer.php",
    "*://cstimer.net/timer.php?*"
];

var dataKeys = [
    "cts-props",
    "cts-sess1",
    "cts-sess2",
    "cts-sess3",
    "cts-sess4",
    "cts-sess5",
    "cts-sess6",
    "cts-sess7",
    "cts-sess8",
    "cts-sess9",
    "cts-sess10",
    "cts-sess11",
    "cts-sess12",
    "cts-sess13",
    "cts-sess14",
    "cts-sess15",
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

function saveLocalStorage(data) {
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
            code += "var element = document.getElementsByTagName('select')[2];";
            code += "element.value = '15';";
            code += "var evt = document.createEvent('HTMLEvents');";
            code += "evt.initEvent('change', false, true);";
            code += "element.dispatchEvent(evt);";

            code += 'localStorage.setItem("properties", JSON.stringify('+data['cts-props']+'));';

            // Currently there are 15 sessions
            for (var i = 1; i <= 15; i++) {
                code += 'localStorage.setItem("session'+i+'", JSON.stringify('+data['cts-sess'+i]+'));';
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

function saveSessionToSyncedStorage(data) {
    clearErrorMessage();
    // data = {cts-props: ..., cts-sess[1-15]: ....}
    var d = new Date();
    data["cts-save-time"] = d.toLocaleString();
    chrome.storage.sync.set(data, function() {
        if (chrome.runtime.lastError) {
            renderStatus("Error saving data");
            setErrorMessage(chrome.runtime.lastError.message);
        } else {
            renderStatus("Session saved");
        }
    });
}

function getSessionFromSyncedStorage() {
    clearErrorMessage();
    chrome.storage.sync.get(dataKeys, function(data) {
        if (data["cts-save-time"]) {
            saveLocalStorage(data);
        }
    });
}

function displaySavedSessionExists() {
    clearErrorMessage();
    chrome.storage.sync.get(dataKeys, function(data) {
        if (data["cts-save-time"]) {
            renderStatus('<br>Last saved on '+data["cts-save-time"]);
        } else {
            renderStatus("No data");
        }
    });
}

function clearSessionFromSyncedStorage() {
    // cstimer-data is from old version
    // This line will be removed in version 1
    chrome.storage.sync.remove("cstimer-data");
    chrome.storage.sync.remove(dataKeys);
    renderStatus("Data cleared");
}

(function() {
    document.getElementById("saveBtn").addEventListener("click", getLocalStorage);
    document.getElementById("loadBtn").addEventListener("click", getSessionFromSyncedStorage);
    document.getElementById("removeBtn").addEventListener("click", clearSessionFromSyncedStorage);

    // When getting the data from csTimer, it's sent in a message
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            saveSessionToSyncedStorage(request);
        }
    );

    displaySavedSessionExists();
})();
