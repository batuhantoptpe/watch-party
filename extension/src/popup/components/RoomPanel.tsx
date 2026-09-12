import { useState } from "react";

export function RoomPanel({ roomCode, peerCount }: { roomCode: string; peerCount: number }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="room-panel">
      <p className="room-panel-label">Oda kodu</p>
      <div className="room-code-chip">
        <span className="code">{roomCode}</span>
        <button className="copy-btn" onClick={copyCode}>
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
      <p className="peer-count">
        {peerCount === 0 ? "Karşı taraf henüz yok" : `${peerCount} kişi daha burada`}
      </p>
    </div>
  );
}
