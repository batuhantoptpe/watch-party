import type { PeerInfo } from "shared";
import { generateRoomCode } from "../socket/roomCode.js";
import type { Room } from "./types.js";

export class RoomStore {
  private rooms = new Map<string, Room>();

  createRoom(): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room: Room = { code, peers: new Map(), createdAt: Date.now() };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addPeer(code: string, peer: PeerInfo): Room | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    room.peers.set(peer.peerId, peer);
    return room;
  }

  /** Removes the peer and deletes the room entirely once it's empty. */
  removePeer(code: string, peerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.peers.delete(peerId);
    if (room.peers.size === 0) {
      this.rooms.delete(code);
    }
  }

  getPeers(code: string): PeerInfo[] {
    return [...(this.rooms.get(code)?.peers.values() ?? [])];
  }

  hasPeer(code: string, peerId: string): boolean {
    return this.rooms.get(code)?.peers.has(peerId) ?? false;
  }
}
