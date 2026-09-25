"use client";

import { useState, useTransition } from "react";
import { deleteStudent } from "./actions";

export function DeleteStudentButton({ studentId, name }: { studentId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Hapus siswa "${name}" secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(studentId);
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
