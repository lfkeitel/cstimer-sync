let db = null;

function openDB() {
  const idb = window.indexedDB.open("cstimer");
  idb.onerror = (event) =>
    console.error("Database error: " + event.target.errorCode);
  idb.onsuccess = (event) => {
    db = event.target.result;
  };
}

function sendData(action, data) {
  chrome.runtime.sendMessage({ action, data });
}

function getSessions(db, timer_ls) {
  db.transaction("sessions").objectStore("sessions").openCursor().onsuccess = (
    event
  ) => {
    const cursor = event.target.result;
    if (cursor === null) {
      sendData("sessionData", timer_ls);
      return;
    }

    const key_parts = cursor.key.split("_");
    const key_idx = key_parts[1];
    timer_ls.sessions[key_idx] = JSON.stringify(cursor.value);
    cursor.continue();
  };
}

function retrieveSessionData() {
  const timer_ls = {
    sessions: {},
    "cts-props": localStorage.getItem("properties"),
  };

  getSessions(timer_ls);
}

function loadSessionData(data) {
  localStorage.setItem("properties", data["cts-props"]);

  const objectStore = db
    .transaction("sessions", "readwrite")
    .objectStore("sessions");

  for (const sessionName in data.sessions) {
    const json = JSON.parse(data.sessions[sessionName]);
    const key = `session_${sessionName}_00`;

    var req = objectStore.put(json, key);
    req.onerror = (event) =>
      console.error("Database error: " + event.target.errorCode);
  }

  setTimeout(() => {
    sendData("loaded", Object.keys(data.sessions).length);
    location.reload();
  }, 5000);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case "save":
      retrieveSessionData();
    case "load":
      loadSessionData(request.data);
  }
});

openDB();
