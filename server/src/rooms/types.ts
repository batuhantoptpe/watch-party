import type { PeerInfo } from "shared";

export interface Room {
  code: string;
  peers: Map<string, PeerInfo>;
  createdAt: number;
}
