import type { BackgroundToPopup, ContentToBackground, PopupToBackground } from "../shared-ext/runtimeMessages.js";
import * as connection from "./connectionManager.js";
import { state } from "./state.js";

function handleContentMessage(message: ContentToBackground, sender: chrome.runtime.MessageSender): void {
  switch (message.kind) {
    case "frame-owns-video":
      if (sender.tab?.id !== undefined && sender.frameId !== undefined) {
        // Once a tab is pinned (a room is active), ignore any other tab's
        // video — otherwise opening something else in a new tab would hijack
        // sync away from the movie.
        if (state.pinnedTabId === null || state.pinnedTabId === sender.tab.id) {
          state.activeTarget = { tabId: sender.tab.id, frameId: sender.frameId };
        }
      }
      state.setVideoDetected();
      break;
    case "local-play":
      connection.sendPlaybackEvent("play", message.currentTime);
      break;
    case "local-pause":
      connection.sendPlaybackEvent("pause", message.currentTime);
      break;
    case "local-seek":
      connection.sendPlaybackEvent("seek", message.currentTime);
      break;
    case "local-heartbeat":
      connection.sendHeartbeat(message.currentTime, message.isPlaying);
      break;
    case "autoplay-blocked":
      // Known limitation for MVP: surfaced nowhere yet, browser blocked a programmatic play().
      break;
  }
}

const popupPorts = new Set<chrome.runtime.Port>();

function broadcastToPopups(message: BackgroundToPopup): void {
  for (const port of popupPorts) {
    try {
      port.postMessage(message);
    } catch {
      popupPorts.delete(port);
    }
  }
}

function handlePopupMessage(message: PopupToBackground, port: chrome.runtime.Port): void {
  switch (message.kind) {
    case "get-status":
      port.postMessage({ kind: "status-update", snapshot: state.snapshot() } satisfies BackgroundToPopup);
      break;
    case "create-room":
      state.pinActiveTab().then(() =>
        connection.createRoom().catch((err: Error) => {
          port.postMessage({ kind: "room-error", error: err.message } satisfies BackgroundToPopup);
        }),
      );
      break;
    case "join-room":
      state.pinActiveTab().then(() =>
        connection
          .joinRoom(message.roomCode)
          .then((ack) => {
            if (!ack.ok) {
              port.postMessage({ kind: "room-error", error: ack.error } satisfies BackgroundToPopup);
            }
          })
          .catch((err: Error) => {
            port.postMessage({ kind: "room-error", error: err.message } satisfies BackgroundToPopup);
          }),
      );
      break;
    case "leave-room":
      connection.leaveRoom();
      state.clearPin();
      break;
    case "send-chat":
      connection.sendChat(message.text);
      break;
  }
}

export function registerMessageRouter(): void {
  chrome.runtime.onMessage.addListener((message: ContentToBackground, sender) => {
    handleContentMessage(message, sender);
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "popup") return;
    popupPorts.add(port);
    state.setPopupOpen(true);
    port.postMessage({ kind: "status-update", snapshot: state.snapshot() } satisfies BackgroundToPopup);
    port.onMessage.addListener((message: PopupToBackground) => handlePopupMessage(message, port));
    port.onDisconnect.addListener(() => {
      popupPorts.delete(port);
      state.setPopupOpen(popupPorts.size > 0);
    });
  });

  state.onChange((snapshot) => broadcastToPopups({ kind: "status-update", snapshot }));
}
