import type { Server, Socket } from "socket.io";
import type {
  ChatMessageBroadcast,
  ChatMessageRequest,
  CreateRoomAck,
  HeartbeatSyncBroadcast,
  HeartbeatSyncRequest,
  JoinRoomAck,
  JoinRoomRequest,
  PeerJoinedEvent,
  PeerLeftEvent,
  PlaybackAction,
  PlaybackEventBroadcast,
  PlaybackEventRequest,
} from "shared";
import { RoomStore } from "../rooms/RoomStore.js";

interface SocketData {
  roomCode?: string;
}

function isInRoom(socket: Socket<any, any, any, SocketData>, roomCode: string): boolean {
  return socket.data.roomCode === roomCode;
}

function leaveCurrentRoom(io: Server, socket: Socket<any, any, any, SocketData>, roomStore: RoomStore) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;
  roomStore.removePeer(roomCode, socket.id);
  socket.leave(roomCode);
  const event: PeerLeftEvent = { type: "peer-left", peerId: socket.id };
  io.to(roomCode).emit("peer-left", event);
  socket.data.roomCode = undefined;
}

export function registerSocketHandlers(io: Server, roomStore: RoomStore): void {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on("create-room", (ack: (res: CreateRoomAck) => void) => {
      const room = roomStore.createRoom();
      roomStore.addPeer(room.code, { peerId: socket.id, joinedAt: Date.now() });
      socket.join(room.code);
      socket.data.roomCode = room.code;
      ack({ roomCode: room.code, peerId: socket.id });
    });

    socket.on("join-room", (req: JoinRoomRequest, ack: (res: JoinRoomAck) => void) => {
      const room = roomStore.getRoom(req.roomCode);
      if (!room) {
        ack({ ok: false, error: "Oda bulunamadı." });
        return;
      }
      const peer = { peerId: socket.id, displayName: req.displayName, joinedAt: Date.now() };
      const existingPeers = roomStore.getPeers(req.roomCode);
      roomStore.addPeer(req.roomCode, peer);
      socket.join(req.roomCode);
      socket.data.roomCode = req.roomCode;

      ack({ ok: true, peerId: socket.id, peers: existingPeers });

      const joinedEvent: PeerJoinedEvent = { type: "peer-joined", peer };
      socket.to(req.roomCode).emit("peer-joined", joinedEvent);
    });

    socket.on("leave-room", () => {
      leaveCurrentRoom(io, socket, roomStore);
    });

    const relayPlayback = (actionType: PlaybackAction) => (req: PlaybackEventRequest) => {
      if (!isInRoom(socket, req.roomCode)) return;
      const event: PlaybackEventBroadcast = {
        type: actionType,
        senderId: socket.id,
        currentTime: req.currentTime,
        originTimestamp: req.originTimestamp,
        serverTimestamp: Date.now(),
      };
      socket.to(req.roomCode).emit(actionType, event);
    };
    socket.on("play", relayPlayback("play"));
    socket.on("pause", relayPlayback("pause"));
    socket.on("seek", relayPlayback("seek"));

    socket.on("heartbeat-sync", (req: HeartbeatSyncRequest) => {
      if (!isInRoom(socket, req.roomCode)) return;
      const event: HeartbeatSyncBroadcast = {
        type: "heartbeat-sync",
        senderId: socket.id,
        currentTime: req.currentTime,
        isPlaying: req.isPlaying,
        originTimestamp: req.originTimestamp,
        serverTimestamp: Date.now(),
      };
      socket.to(req.roomCode).emit("heartbeat-sync", event);
    });

    socket.on("chat-message", (req: ChatMessageRequest) => {
      if (!isInRoom(socket, req.roomCode)) return;
      const event: ChatMessageBroadcast = {
        type: "chat-message",
        senderId: socket.id,
        text: req.text,
        originTimestamp: req.originTimestamp,
      };
      io.to(req.roomCode).emit("chat-message", event);
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket, roomStore);
    });
  });
}
