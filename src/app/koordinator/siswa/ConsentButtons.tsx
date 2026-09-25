"use client";

import { useState, useTransition } from "react";
import { setConsent } from "./actions";

export function ConsentButtons({ studentId, status }: { studentId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [guardianName, setGuardianName] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(granted: boolean, name: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setConsent(studentId, granted, name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan perubahan");
      }
    });
  }

  if (status === "GRANTED") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => submit(false, "Wali murid")}>
          {pending ? "..." : "Cabut"}
        </button>
        {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
      </span>
    );
  }

  if (asking) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          autoFocus
          placeholder="Nama wali"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          style={{ width: 120, padding: "5px 8px", border: "1px solid var(--edge-2)", borderRadius: 3, fontSize: 12 }}
        />
        <button className="btn btn-sm" disabled={pending || !guardianName} onClick={() => submit(true, guardianName)}>
          {pending ? "..." : "Setujui"}
        </button>
        {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  return (
    <button className="btn btn-sm" onClick={() => setAsking(true)}>
      Setujui persetujuan
    </button>
  );
}
