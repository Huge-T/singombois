"use client";

import { useState, useTransition } from "react";
import { setConsent } from "./actions";

export function ConsentButtons({ studentId, status }: { studentId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [guardianName, setGuardianName] = useState("");
  const [asking, setAsking] = useState(false);

  if (status === "GRANTED") {
    return (
      <button
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => startTransition(() => setConsent(studentId, false, "Wali murid"))}
      >
        Cabut
      </button>
    );
  }

  if (asking) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          placeholder="Nama wali"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          style={{ width: 120, padding: "5px 8px", border: "1px solid var(--edge-2)", borderRadius: 3, fontSize: 12 }}
        />
        <button
          className="btn btn-sm"
          disabled={pending || !guardianName}
          onClick={() => startTransition(() => setConsent(studentId, true, guardianName))}
        >
          Setujui
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-sm" onClick={() => setAsking(true)}>
      Setujui persetujuan
    </button>
  );
}
