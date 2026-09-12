/**
 * Wire protocol between the extension's background service worker and the
 * relay server. Video/audio never crosses this boundary — only small control
 * messages (playback actions, heartbeats, chat text).
 */

export interface PeerInfo {
  peerId: string;
  displayName?: string;
  joinedAt: number;
}

export type PlaybackAction = "play" | "pause" | "seek";

// ---- Client -> Server ----

export interface CreateRoomRequest {
  type: "create-room";
}

export interface JoinRoomRequest {
  type: "join-room";
  roomCode: string;
  displayName?: string;
}

export interface LeaveRoomRequest {
  type: "leave-room";
}

export interface PlaybackEventRequest {
  type: PlaybackAction;
  roomCode: string;
  currentTime: number;
  originTimestamp: number;
}

export interface HeartbeatSyncRequest {
  type: "heartbeat-sync";
  roomCode: string;
  currentTime: number;
  isPlaying: boolean;
  originTimestamp: number;
}

export interface ChatMessageRequest {
  type: "chat-message";
  roomCode: string;
  text: string;
  originTimestamp: number;
}

export type ClientToServer =
  | CreateRoomRequest
  | JoinRoomRequest
  | LeaveRoomRequest
  | PlaybackEventRequest
  | HeartbeatSyncRequest
  | ChatMessageRequest;

// ---- Ack payloads (Socket.IO callback responses) ----

export interface CreateRoomAck {
  roomCode: string;
  peerId: string;
}

export type JoinRoomAck =
  | { ok: true; peerId: string; peers: PeerInfo[] }
  | { ok: false; error: string };

// ---- Server -> Client (broadcast) ----

export interface PeerJoinedEvent {
  type: "peer-joined";
  peer: PeerInfo;
}

export interface PeerLeftEvent {
  type: "peer-left";
  peerId: string;
}

export interface PlaybackEventBroadcast {
  type: PlaybackAction;
  senderId: string;
  currentTime: number;
  originTimestamp: number;
  serverTimestamp: number;
}

export interface HeartbeatSyncBroadcast {
  type: "heartbeat-sync";
  senderId: string;
  currentTime: number;
  isPlaying: boolean;
  originTimestamp: number;
  serverTimestamp: number;
}

export interface ChatMessageBroadcast {
  type: "chat-message";
  senderId: string;
  displayName?: string;
  text: string;
  originTimestamp: number;
}

export interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
}

export type ServerToClient =
  | PeerJoinedEvent
  | PeerLeftEvent
  | PlaybackEventBroadcast
  | HeartbeatSyncBroadcast
  | ChatMessageBroadcast
  | ErrorEvent;
