import { useEffect, useRef, useState } from "react";
import type { BackgroundToPopup, PopupToBackground, StatusSnapshot } from "../shared-ext/runtimeMessages.js";

const initialSnapshot: StatusSnapshot = {
  status: "disconnected",
  roomCode: null,
  peerId: null,
  peerCount: 0,
  chatHistory: [],
};

export function usePopupPort() {
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const [snapshot, setSnapshot] = useState<StatusSnapshot>(initialSnapshot);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "popup" });
    portRef.current = port;

    port.onMessage.addListener((message: BackgroundToPopup) => {
      if (message.kind === "status-update") {
        setSnapshot(message.snapshot);
        setJoinError(null);
      } else if (message.kind === "join-error") {
        setJoinError(message.error);
      }
    });

    port.postMessage({ kind: "get-status" } satisfies PopupToBackground);

    return () => port.disconnect();
  }, []);

  function send(message: PopupToBackground): void {
    portRef.current?.postMessage(message);
  }

  return { snapshot, joinError, send };
}
