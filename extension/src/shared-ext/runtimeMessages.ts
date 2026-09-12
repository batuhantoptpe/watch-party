/**
 * Internal chrome.runtime message contracts (background <-> content script <-> popup).
 * Deliberately separate from the server wire protocol in `shared` — these never
 * cross the network, only chrome's extension messaging boundary.
 */

export interface FrameOwnsVideoMessage {
  kind: "frame-owns-video";
}

export interface LocalPlaybackMessage {
  kind: "local-play" | "local-pause" | "local-seek";
  currentTime: number;
  timestamp: number;
}

export interface LocalHeartbeatMessage {
  kind: "local-heartbeat";
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}

export interface AutoplayBlockedMessage {
  kind: "autoplay-blocked";
}

export type ContentToBackground =
  | FrameOwnsVideoMessage
  | LocalPlaybackMessage
  | LocalHeartbeatMessage
  | AutoplayBlockedMessage;

export interface RemotePlaybackMessage {
  kind: "remote-play" | "remote-pause" | "remote-seek";
  currentTime: number;
  originTimestamp: number;
}

export interface RemoteSyncMessage {
  kind: "remote-sync";
  expectedTime: number;
}

export type BackgroundToContent = RemotePlaybackMessage | RemoteSyncMessage;

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface ChatEntry {
  senderId: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface StatusSnapshot {
  status: ConnectionStatus;
  roomCode: string | null;
  peerId: string | null;
  peerCount: number;
  chatHistory: ChatEntry[];
  videoDetected: boolean;
}

export interface CreateRoomPopupMessage {
  kind: "create-room";
}

export interface JoinRoomPopupMessage {
  kind: "join-room";
  roomCode: string;
}

export interface LeaveRoomPopupMessage {
  kind: "leave-room";
}

export interface SendChatPopupMessage {
  kind: "send-chat";
  text: string;
}

export interface GetStatusPopupMessage {
  kind: "get-status";
}

export type PopupToBackground =
  | CreateRoomPopupMessage
  | JoinRoomPopupMessage
  | LeaveRoomPopupMessage
  | SendChatPopupMessage
  | GetStatusPopupMessage;

export interface StatusUpdateMessage {
  kind: "status-update";
  snapshot: StatusSnapshot;
}

export interface RoomErrorMessage {
  kind: "room-error";
  error: string;
}

export type BackgroundToPopup = StatusUpdateMessage | RoomErrorMessage;
