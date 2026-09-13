import { DRIFT_THRESHOLD_S, GUARD_SUPPRESS_WINDOW_MS, SEEK_EPSILON_S, type PlaybackAction } from "shared";
import type { ContentToBackground } from "../shared-ext/runtimeMessages.js";

type LocalPlaybackKind = "local-play" | "local-pause" | "local-seek";

const ACTION_TO_LOCAL_KIND: Record<PlaybackAction, LocalPlaybackKind> = {
  play: "local-play",
  pause: "local-pause",
  seek: "local-seek",
};

/**
 * Attaches to a single <video> element, relaying local play/pause/seek events
 * to the background worker and applying remote ones back onto the DOM.
 *
 * The suppress window (not a single boolean) guards against feedback loops:
 * setting currentTime / calling play()/pause() dispatches native events
 * asynchronously, sometimes on a later tick, so a flag cleared synchronously
 * right after the call can miss the echo. A short time window covers it.
 */
export class VideoController {
  private video: HTMLVideoElement | null = null;
  private suppressUntil = 0;

  private handlePlay = () => this.sendLocal("play");
  private handlePause = () => this.sendLocal("pause");
  private handleSeeked = () => this.sendLocal("seek");

  attach(video: HTMLVideoElement): void {
    if (this.video === video) return;
    this.detach();
    this.video = video;
    video.addEventListener("play", this.handlePlay);
    video.addEventListener("pause", this.handlePause);
    video.addEventListener("seeked", this.handleSeeked);
  }

  detach(): void {
    if (!this.video) return;
    this.video.removeEventListener("play", this.handlePlay);
    this.video.removeEventListener("pause", this.handlePause);
    this.video.removeEventListener("seeked", this.handleSeeked);
    this.video = null;
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? 0;
  }

  isPlaying(): boolean {
    return this.video ? !this.video.paused : false;
  }

  private sendLocal(action: PlaybackAction): void {
    if (!this.video) return;
    if (Date.now() < this.suppressUntil) return; // echo from a just-applied remote action
    const message: ContentToBackground = {
      kind: ACTION_TO_LOCAL_KIND[action],
      currentTime: this.video.currentTime,
      timestamp: Date.now(),
    };
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  // currentTime already has any network-delay compensation applied upstream
  // (in the background worker, using a same-machine RTT measurement rather
  // than comparing clocks across two different computers).
  applyRemote(action: PlaybackAction, currentTime: number): void {
    if (!this.video) return;
    this.suppressUntil = Date.now() + GUARD_SUPPRESS_WINDOW_MS;
    if (Math.abs(this.video.currentTime - currentTime) > SEEK_EPSILON_S) {
      this.video.currentTime = currentTime;
    }
    if (action === "play") {
      this.video.play().catch(() => {
        const message: ContentToBackground = { kind: "autoplay-blocked" };
        chrome.runtime.sendMessage(message).catch(() => {});
      });
    } else if (action === "pause") {
      this.video.pause();
    }
  }

  /** Heartbeat-driven drift correction — only ever nudges currentTime, never play/pause state. */
  applyDriftCorrection(expectedTime: number): void {
    if (!this.video) return;
    if (Math.abs(this.video.currentTime - expectedTime) > DRIFT_THRESHOLD_S) {
      this.suppressUntil = Date.now() + GUARD_SUPPRESS_WINDOW_MS;
      this.video.currentTime = expectedTime;
    }
  }
}
