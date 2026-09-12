import type { BackgroundToContent } from "../shared-ext/runtimeMessages.js";
import { state } from "./state.js";

/** Sends a message to whichever frame most recently reported it owns the video. */
export function forwardToActiveFrame(message: BackgroundToContent): void {
  const target = state.activeTarget;
  if (!target) return;
  chrome.tabs.sendMessage(target.tabId, message, { frameId: target.frameId }).catch(() => {
    // Frame navigated away or closed — drop silently, next "frame-owns-video" will re-register.
  });
}
