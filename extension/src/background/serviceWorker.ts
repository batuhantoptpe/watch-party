import { ensureConnected, joinRoom } from "./connectionManager.js";
import { registerMessageRouter } from "./messageRouter.js";
import { state } from "./state.js";

const KEEPALIVE_ALARM = "cinemate-keepalive";

registerMessageRouter();
ensureConnected();

// MV3 can suspend an idle service worker; chrome.alarms is the sanctioned way
// to periodically wake it back up so the socket reconnects promptly.
chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.33 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) ensureConnected();
});

// On a fresh service-worker start, rejoin whatever room we were last in
// (within this browser session — chrome.storage.session clears on browser restart).
state.restoreRoomCode().then((roomCode) => {
  if (roomCode) joinRoom(roomCode).catch(() => {});
});
