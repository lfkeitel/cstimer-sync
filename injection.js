var timer_ls = {};
timer_ls["cts-props"] = localStorage.getItem("properties");
var numberOfSessions = JSON.parse(timer_ls["cts-props"]).sessionN;

// Get sessions
for (var i = 1; i <= numberOfSessions; i++) {
    timer_ls['cts-sess'+i] = localStorage.getItem("session"+i);

    if (timer_ls['cts-sess'+i] === null) {
        timer_ls['cts-sess'+i] = "[]";
    }
}

chrome.runtime.sendMessage(timer_ls);
