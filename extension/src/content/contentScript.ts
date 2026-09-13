import { HEARTBEAT_INTERVAL_MS } from "shared";
import type { BackgroundToContent, ContentToBackground } from "../shared-ext/runtimeMessages.js";
import { findAndWatchVideo } from "./findVideo.js";
import { VideoController } from "./videoController.js";

const controller = new VideoController();
let heartbeatTimer: number | undefined;

console.log("[cinemate] content script active on", location.href);

let videoFound = false;
window.setTimeout(() => {
  if (!videoFound) {
    console.warn(
      "[cinemate] 8 saniye geçti ama bu sayfada/çerçevede senkronlanacak bir <video> bulunamadı:",
      location.href,
    );
  }
}, 8000);

const stopWatching = findAndWatchVideo((video) => {
  videoFound = true;
  console.log("[cinemate] video found and attached:", video, "src:", video.currentSrc || video.src);
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
