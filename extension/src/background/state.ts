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
    };
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
    this.notify();
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
