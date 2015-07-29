var timer_ls = {};
timer_ls["cts-props"] = localStorage.getItem("properties");

// Get sessions
// Currently there are 15 sessions
for (var i = 1; i <= 15; i++) {
    timer_ls['cts-sess'+i] = localStorage.getItem("session"+i);

    if (timer_ls['cts-sess'+i] === null) {
        timer_ls['cts-sess'+i] = "[]";
    }
}

chrome.runtime.sendMessage(timer_ls);
