# Wire Protocol

Messages between the extension's background service worker and the relay
server, defined as TypeScript types in `shared/src/protocol.ts`. Video/audio
never crosses this boundary — only small control messages.

## Client → Server

| Event | Payload | Notes |
|---|---|---|
| `create-room` | *(none)* | Ack: `{ roomCode, peerId }` |
| `join-room` | `{ roomCode, displayName? }` | Ack: `{ ok: true, peerId, peers }` \| `{ ok: false, error }` |
| `leave-room` | *(none)* | |
| `play` / `pause` / `seek` | `{ roomCode, currentTime, originTimestamp }` | Fire-and-forget broadcast to the room |
| `heartbeat-sync` | `{ roomCode, currentTime, isPlaying, originTimestamp }` | Sent every ~4s for drift correction |
| `chat-message` | `{ roomCode, text, originTimestamp }` | |

## Server → Client (broadcast to room, excluding sender unless it's chat)

| Event | Payload |
|---|---|
| `peer-joined` | `{ peer: { peerId, displayName?, joinedAt } }` |
| `peer-left` | `{ peerId }` |
| `play` / `pause` / `seek` | `{ senderId, currentTime, originTimestamp, serverTimestamp }` |
| `heartbeat-sync` | `{ senderId, currentTime, isPlaying, originTimestamp, serverTimestamp }` |
| `chat-message` | `{ senderId, text, originTimestamp }` (broadcast to everyone including sender, for a consistent chat log) |
| `error` | `{ code, message }` |

## Drift correction

Every ~4s each peer emits `heartbeat-sync` with its local `currentTime`. A
receiver projects the sender's time forward by network transit
(`currentTime + elapsed` when `isPlaying`) and, if the gap versus its own
`currentTime` exceeds ~0.75s, silently seeks to the expected time. Heartbeats
never change play/pause state — only `play`/`pause` events do that.

## Feedback-loop guard (extension side)

Applying a remote action (`video.currentTime = x`, `video.play()`,
`video.pause()`) can itself fire the native `play`/`pause`/`seeked` listeners
we use to detect *local* actions. Each attach point suppresses local echo for
a short window (~400ms) after applying a remote action, rather than a single
boolean flag — DOM events triggered by a programmatic change can fire on a
later tick, so a flag cleared synchronously right after the call can miss it.

## Known limitations (MVP)

- Netflix/YouTube-style DRM platforms are out of scope; the generic
  `<video>`-element approach may work partially or not at all there.
- No accounts — a room is just a random 6-character code, live only in the
  server's memory.
- Reconnecting to the relay server gives a new Socket.IO id, so a peer's
  `peerId` can change across a network blip (looks like "left" + "joined").
- Clicking an invite link cannot auto-open the extension popup (Manifest V3
  restriction) — the user copies the code and pastes it in manually.
