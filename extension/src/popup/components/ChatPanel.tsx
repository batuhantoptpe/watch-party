import { useState } from "react";
import type { ChatEntry } from "../../shared-ext/runtimeMessages.js";

function SendIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M1 8 L14 2 L10 8 L14 14 Z" />
    </svg>
  );
}

export function ChatPanel({
  chatHistory,
  onSend,
}: {
  chatHistory: ChatEntry[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <>
      <hr className="divider" />
      <div className="chat">
        <div className="chat-log">
          {chatHistory.length === 0 && <p className="chat-empty">Henüz mesaj yok</p>}
          {chatHistory.map((entry, i) => (
            <div key={i} className={`chat-row ${entry.senderId === "system" ? "system" : entry.isLocal ? "mine" : ""}`}>
              <span className="bubble">{entry.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Mesaj yaz..."
          />
          <button className="send-btn" onClick={submit} aria-label="Gönder">
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}
