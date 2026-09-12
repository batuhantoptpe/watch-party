import { ChatPanel } from "./components/ChatPanel.js";
import { ConnectionStatus } from "./components/ConnectionStatus.js";
import { CreateOrJoinRoom } from "./components/CreateOrJoinRoom.js";
import { RoomPanel } from "./components/RoomPanel.js";
import { VideoStatus } from "./components/VideoStatus.js";
import { usePopupPort } from "./usePopupPort.js";

function BrandMark() {
  return (
    <span className="brand-mark">
      <svg viewBox="0 0 10 10">
        <path d="M1 0.5 L9 5 L1 9.5 Z" />
      </svg>
    </span>
  );
}

export function App() {
  const { snapshot, roomError, send } = usePopupPort();

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Watch Party</span>
        </div>
        <ConnectionStatus snapshot={snapshot} />
      </header>
      <hr className="divider" />
      <div className="body">
        <VideoStatus videoDetected={snapshot.videoDetected} />
        {snapshot.roomCode ? (
          <>
            <RoomPanel roomCode={snapshot.roomCode} peerCount={snapshot.peerCount} />
            <ChatPanel chatHistory={snapshot.chatHistory} onSend={(text) => send({ kind: "send-chat", text })} />
            <div className="leave-row">
              <button className="btn-ghost" onClick={() => send({ kind: "leave-room" })}>
                Odadan ayrıl
              </button>
            </div>
          </>
        ) : (
          <CreateOrJoinRoom
            roomError={roomError}
            onCreate={() => send({ kind: "create-room" })}
            onJoin={(roomCode) => send({ kind: "join-room", roomCode })}
          />
        )}
      </div>
    </div>
  );
}
