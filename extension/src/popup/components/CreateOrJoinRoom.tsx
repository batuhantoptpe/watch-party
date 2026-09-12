import { useState } from "react";

export function CreateOrJoinRoom({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <>
      <p className="lede">Bu akşam ne izliyoruz?</p>
      <button className="btn btn-primary" onClick={onCreate}>
        Film gecesi başlat
      </button>
      <p className="join-label">ya da bir kodla katıl</p>
      <div className="join-row">
        <input
          className="input input-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD"
          maxLength={6}
        />
        <button className="btn btn-secondary" onClick={() => code && onJoin(code)}>
          Katıl
        </button>
      </div>
    </>
  );
}
