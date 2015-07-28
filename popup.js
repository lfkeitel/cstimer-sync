function renderStatus(message) {
    document.getElementById("status").innerHTML = message;
}

function getLocalStorage() {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: "http://*.cstimer.net/timer.php"
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
        url: "http://*.cstimer.net/timer.php"
    }, function(tabs) {
        if (tabs.length) {
            var tab = tabs[0];

            var code = 'localStorage.setItem("properties",JSON.stringify('+data.properties+'));';

            // Currently there are 15 sessions
            for (var i = 1; i <= 15; i++) {
                code += 'localStorage.setItem("session'+i+'",JSON.stringify('+data['session'+i]+'));';
            }

            code += "location.reload();"

            chrome.tabs.executeScript(tab.id, {
                code: code
            }, function() {
                renderStatus('Session loaded');
                window.close();
            });
        }
    });
}

function saveSessionToSyncedStorage(data) {
    chrome.storage.sync.set({"cstimer-data": data}, function() {
        if (chrome.runtime.lastError) {
            renderStatus("There was an error saving data to Chrome Sync");
        } else {
            renderStatus("Session saved");
        }
    });
}

function getSessionFromSyncedStorage() {
    chrome.storage.sync.get("cstimer-data", function(data) {
        if (data['cstimer-data']) {
            saveLocalStorage(data['cstimer-data']);
        }
    });
}

function displaySavedSessionExists() {
    chrome.storage.sync.get("cstimer-data", function(data) {
        if (data['cstimer-data']) {
            renderStatus("Saved session exists");
        } else {
            renderStatus("No session data");
        }
    });
}

function clearSessionFromSyncedStorage() {
    chrome.storage.sync.remove("cstimer-data");
    displaySavedSessionExists();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("saveBtn").addEventListener("click", getLocalStorage);
    document.getElementById("loadBtn").addEventListener("click", getSessionFromSyncedStorage);
    document.getElementById("removeBtn").addEventListener("click", clearSessionFromSyncedStorage);

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(request);
            saveSessionToSyncedStorage(request);
        }
    );

    displaySavedSessionExists();
});
