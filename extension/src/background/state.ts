import type { ChatEntry, ConnectionStatus, StatusSnapshot } from "../shared-ext/runtimeMessages.js";

export interface ActiveTarget {
  tabId: number;
  frameId: number;
}

/**
 * Authoritative in-memory background state. Mirrored to chrome.storage.session
 * (room code only) so a service-worker restart can rejoin the room it was in —
 * session storage clears on full browser restart on purpose, since resuming
 * into a stale room across restarts is undesirable.
 */
class BackgroundState {
  status: ConnectionStatus = "disconnected";
  roomCode: string | null = null;
  peerId: string | null = null;
  peerCount = 0;
  chatHistory: ChatEntry[] = [];
  activeTarget: ActiveTarget | null = null;
  /**
   * True once some page's content script has ever reported finding a
   * playable <video>. There's no clean "un-detect" signal (a page not
   * having a video isn't an event), so this is "found at least once this
   * session" rather than "is on the current page right now" — good enough
   * to answer "does the extension see a video on this kind of site at all".
   */
  videoDetected = false;
  private popupOpen = false;
  private unreadCount = 0;

  private listeners = new Set<(snapshot: StatusSnapshot) => void>();

  onChange(listener: (snapshot: StatusSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): StatusSnapshot {
    return {
      status: this.status,
      roomCode: this.roomCode,
      peerId: this.peerId,
      peerCount: this.peerCount,
      chatHistory: this.chatHistory,
      videoDetected: this.videoDetected,
    };
  }

  setVideoDetected(): void {
    if (this.videoDetected) return;
    this.videoDetected = true;
    this.notify();
  }

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.notify();
  }

  setRoom(roomCode: string | null, peerId: string | null): void {
    this.roomCode = roomCode;
    this.peerId = peerId;
    if (!roomCode) this.chatHistory = [];
    this.notify();
  }

  setPeerCount(count: number): void {
    this.peerCount = Math.max(0, count);
    this.notify();
  }

  addChatEntry(entry: ChatEntry): void {
    this.chatHistory.push(entry);
    if (this.chatHistory.length > 200) this.chatHistory.shift();
    // Popup is almost always closed while actually watching, so a badge on
    // the toolbar icon is the only way an incoming message gets noticed.
    if (!this.popupOpen && !entry.isLocal && entry.senderId !== "system") {
      this.unreadCount++;
      this.updateBadge();
    }
    this.notify();
  }

  /** Called by the message router whenever a popup connects/disconnects. */
  setPopupOpen(open: boolean): void {
    this.popupOpen = open;
    if (open) {
      this.unreadCount = 0;
      this.updateBadge();
    }
  }

  private updateBadge(): void {
    const text = this.unreadCount > 0 ? String(Math.min(this.unreadCount, 99)) : "";
    chrome.action.setBadgeText({ text }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ color: "#f2a65a" }).catch(() => {});
  }

  async restoreRoomCode(): Promise<string | null> {
    try {
      const data = await chrome.storage.session.get("roomCode");
      return (data.roomCode as string | undefined) ?? null;
    } catch {
      return null;
    }
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
    chrome.storage.session.set({ roomCode: this.roomCode }).catch(() => {});
  }
}

export const state = new BackgroundState();
