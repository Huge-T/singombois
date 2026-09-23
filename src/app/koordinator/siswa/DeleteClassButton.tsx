"use client";

import { useState, useTransition } from "react";
import { deleteClass } from "./actions";

export function DeleteClassButton({ classId, name, studentCount }: { classId: string; name: string; studentCount: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (studentCount > 0) {
      setError("Kelas masih punya siswa — pindahkan/hapus siswanya dulu.");
      return;
    }
    if (!window.confirm(`Hapus kelas "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteClass(classId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={handleDelete}>
        {pending ? "..." : "Hapus kelas"}
      </button>
      {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
