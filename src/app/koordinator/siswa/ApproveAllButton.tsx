"use client";

import { useState, useTransition } from "react";
import { approveAllPendingConsent } from "./actions";

export function ApproveAllButton({ classId, pendingCount }: { classId: string; pendingCount: number }) {
  const [asking, setAsking] = useState(false);
  const [guardianNote, setGuardianNote] = useState("Wali murid (disetujui massal)");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (pendingCount === 0) return null;

  function submit() {
    if (!window.confirm(`Setujui persetujuan untuk ${pendingCount} siswa sekaligus?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await approveAllPendingConsent(classId, guardianNote);
        setAsking(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyetujui");
      }
    });
  }

  if (asking) {
    return (
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          autoFocus
          value={guardianNote}
          onChange={(e) => setGuardianNote(e.target.value)}
          style={{ width: 220, padding: "5px 8px", border: "1px solid var(--edge-2)", borderRadius: 3, fontSize: 12 }}
        />
        <button type="button" className="btn btn-sm" disabled={pending} onClick={submit}>
          {pending ? "Menyetujui..." : `Setujui ${pendingCount} siswa`}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setAsking(false)}>
          Batal
        </button>
        {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
      </span>
    );
  }

  return (
    <button type="button" className="btn btn-sm" onClick={() => setAsking(true)}>
      Setujui semua ({pendingCount})
    </button>
  );
}
