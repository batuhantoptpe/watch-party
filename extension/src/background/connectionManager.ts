import { io, type Socket } from "socket.io-client";
import type {
  ChatMessageBroadcast,
  CreateRoomAck,
  HeartbeatSyncBroadcast,
  JoinRoomAck,
  PeerJoinedEvent,
  PeerLeftEvent,
  PlaybackAction,
  PlaybackEventBroadcast,
} from "shared";
import { forwardToActiveFrame } from "./frameTarget.js";
import { state } from "./state.js";

// Deployed on Render (free tier — sleeps after 15 min idle, first connect
// after that can take a bit). For local development against `npm run
// dev:server` instead, swap this to "http://localhost:8080".
const SERVER_URL = "https://watch-party-server-lzue.onrender.com";

const REQUEST_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), REQUEST_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

let socket: Socket | null = null;

function ensureSocket(): Socket {
  if (socket) return socket;

  state.setStatus("connecting");
  // MV3 service workers have no XMLHttpRequest, which socket.io-client's default
  // "polling" transport requires for its initial handshake — force websocket-only.
  socket = io(SERVER_URL, { reconnection: true, transports: ["websocket"] });

  socket.on("connect", () => {
    console.log("[watch-party] socket connected", socket!.id);
    state.setStatus("connected");
  });
  socket.on("disconnect", (reason) => {
    console.log("[watch-party] socket disconnected", reason);
    state.setStatus("disconnected");
  });
  socket.on("connect_error", (err) => {
    console.log("[watch-party] socket connect_error", err.message, err);
  });

  socket.on("peer-joined", (event: PeerJoinedEvent) => {
    state.setPeerCount(state.peerCount + 1);
    state.addChatEntry({
      senderId: "system",
      text: `Katılan: ${event.peer.peerId.slice(0, 6)}`,
      timestamp: Date.now(),
      isLocal: false,
    });
  });

  socket.on("peer-left", (event: PeerLeftEvent) => {
    state.setPeerCount(state.peerCount - 1);
    state.addChatEntry({
      senderId: "system",
      text: `Ayrıldı: ${event.peerId.slice(0, 6)}`,
      timestamp: Date.now(),
      isLocal: false,
    });
  });

  (["play", "pause", "seek"] satisfies PlaybackAction[]).forEach((action) => {
    socket!.on(action, (event: PlaybackEventBroadcast) => {
      forwardToActiveFrame({ kind: `remote-${action}`, currentTime: event.currentTime });
    });
  });

  socket.on("heartbeat-sync", (event: HeartbeatSyncBroadcast) => {
    const elapsedSinceOrigin = event.isPlaying ? (Date.now() - event.originTimestamp) / 1000 : 0;
    const expectedTime = event.currentTime + elapsedSinceOrigin;
    forwardToActiveFrame({ kind: "remote-sync", expectedTime });
  });

  socket.on("chat-message", (event: ChatMessageBroadcast) => {
    // Server echoes chat to everyone including the sender, so this is the
    // single place a message gets added — no separate optimistic local add.
    state.addChatEntry({
      senderId: event.senderId,
      text: event.text,
      timestamp: event.originTimestamp,
      isLocal: event.senderId === state.peerId,
    });
  });

  return socket;
}

export function ensureConnected(): void {
  ensureSocket();
}

export function createRoom(): Promise<CreateRoomAck> {
  const s = ensureSocket();
  return withTimeout(
    new Promise<CreateRoomAck>((resolve) => {
      s.emit("create-room", (ack: CreateRoomAck) => {
        state.setRoom(ack.roomCode, ack.peerId);
        state.setPeerCount(0);
        resolve(ack);
      });
    }),
    "Sunucuya bağlanılamadı (zaman aşımı). İnternet bağlantınızı kontrol edip tekrar deneyin.",
  );
}

export function joinRoom(roomCode: string): Promise<JoinRoomAck> {
  const s = ensureSocket();
  return withTimeout(
    new Promise<JoinRoomAck>((resolve) => {
      s.emit("join-room", { type: "join-room", roomCode }, (ack: JoinRoomAck) => {
        if (ack.ok) {
          state.setRoom(roomCode, ack.peerId);
          state.setPeerCount(ack.peers.length);
        }
        resolve(ack);
      });
    }),
    "Sunucuya bağlanılamadı (zaman aşımı). İnternet bağlantınızı kontrol edip tekrar deneyin.",
  );
}

export function leaveRoom(): void {
  socket?.emit("leave-room");
  state.setRoom(null, null);
}

export function sendPlaybackEvent(action: PlaybackAction, currentTime: number): void {
  if (!state.roomCode || !socket) return;
  socket.emit(action, { type: action, roomCode: state.roomCode, currentTime, originTimestamp: Date.now() });
}

export function sendHeartbeat(currentTime: number, isPlaying: boolean): void {
  if (!state.roomCode || !socket) return;
  socket.emit("heartbeat-sync", {
    type: "heartbeat-sync",
    roomCode: state.roomCode,
    currentTime,
    isPlaying,
    originTimestamp: Date.now(),
  });
}

export function sendChat(text: string): void {
  if (!state.roomCode || !socket) return;
  // No optimistic local add — the server echoes chat-message back to the
  // sender too, so the "chat-message" listener above is the single place
  // messages land (avoids showing the sender's own message twice).
  socket.emit("chat-message", { type: "chat-message", roomCode: state.roomCode, text, originTimestamp: Date.now() });
}
