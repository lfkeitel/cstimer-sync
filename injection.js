var timer_ls = {};
timer_ls.properties = localStorage.getItem("properties");

// Get sessions
// Currently there are 15 sessions
for (var i = 1; i <= 15; i++) {
    timer_ls['session'+i] = localStorage.getItem("session"+i);

    if (timer_ls['session'+i] === null) {
        timer_ls['session'+i] = "[]";
    }
}

chrome.runtime.sendMessage(timer_ls);
