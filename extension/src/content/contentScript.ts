import { HEARTBEAT_INTERVAL_MS } from "shared";
import type { BackgroundToContent, ContentToBackground } from "../shared-ext/runtimeMessages.js";
import { findAndWatchVideo } from "./findVideo.js";
import { VideoController } from "./videoController.js";

const controller = new VideoController();
let heartbeatTimer: number | undefined;

const stopWatching = findAndWatchVideo((video) => {
  controller.attach(video);

  const registerMessage: ContentToBackground = { kind: "frame-owns-video" };
  chrome.runtime.sendMessage(registerMessage).catch(() => {});

  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
  heartbeatTimer = window.setInterval(() => {
    const message: ContentToBackground = {
      kind: "local-heartbeat",
      currentTime: controller.getCurrentTime(),
      isPlaying: controller.isPlaying(),
      timestamp: Date.now(),
    };
    chrome.runtime.sendMessage(message).catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);
});

chrome.runtime.onMessage.addListener((message: BackgroundToContent) => {
  switch (message.kind) {
    case "remote-play":
      controller.applyRemote("play", message.currentTime);
      break;
    case "remote-pause":
      controller.applyRemote("pause", message.currentTime);
      break;
    case "remote-seek":
      controller.applyRemote("seek", message.currentTime);
      break;
    case "remote-sync":
      controller.applyDriftCorrection(message.expectedTime);
      break;
  }
});

window.addEventListener("pagehide", () => {
  controller.detach();
  stopWatching();
  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
});
