"use client";

import { useState, useTransition } from "react";
import { deleteSession } from "./actions";

export function DeleteSessionButton({ sessionId, label }: { sessionId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Hapus sesi "${label}" secara permanen? Semua unggahan, skor, dan hasil analisis siswa untuk sesi ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSession(sessionId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={handleDelete}>
        {pending ? "..." : "Hapus"}
      </button>
      {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
