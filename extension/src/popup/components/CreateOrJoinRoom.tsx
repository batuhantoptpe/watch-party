import { useEffect, useRef, useState } from "react";

const SLOW_HINT_DELAY_MS = 4000;

export function CreateOrJoinRoom({
  onCreate,
  onJoin,
  roomError,
}: {
  onCreate: () => void;
  onJoin: (code: string) => void;
  roomError: string | null;
}) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const hintTimer = useRef<number>();

  // A failed create/join re-enables the form so the user can try again.
  useEffect(() => {
    if (roomError) setPending(null);
  }, [roomError]);

  useEffect(() => {
    window.clearTimeout(hintTimer.current);
    if (pending) {
      hintTimer.current = window.setTimeout(() => setShowSlowHint(true), SLOW_HINT_DELAY_MS);
    } else {
      setShowSlowHint(false);
    }
    return () => window.clearTimeout(hintTimer.current);
  }, [pending]);

  function handleCreate() {
    setPending("create");
    onCreate();
  }

  function handleJoin() {
    if (!code) return;
    setPending("join");
    onJoin(code);
  }

  return (
    <>
      <p className="lede">Bu akşam ne izliyoruz?</p>
      <button className="btn btn-primary" onClick={handleCreate} disabled={pending !== null}>
        {pending === "create" ? "Başlatılıyor..." : "Film gecesi başlat"}
      </button>
      <p className="join-label">ya da bir kodla katıl</p>
      <div className="join-row">
        <input
          className="input input-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD"
          maxLength={6}
          disabled={pending !== null}
        />
        <button className="btn btn-secondary" onClick={handleJoin} disabled={pending !== null}>
          {pending === "join" ? "..." : "Katıl"}
        </button>
      </div>
      {showSlowHint && !roomError && (
        <p className="join-label">Sunucu uyanıyor olabilir, ilk seferde 20-30 saniye sürebilir</p>
      )}
      {roomError && <p className="error-text">{roomError}</p>}
    </>
  );
}
