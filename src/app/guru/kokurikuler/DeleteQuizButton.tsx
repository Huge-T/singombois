"use client";

import { useState, useTransition } from "react";
import { deleteKokurikulerQuiz } from "./[quizId]/actions";

export function DeleteQuizButton({ quizId, label }: { quizId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Hapus kuis "${label}" secara permanen? Semua jawaban, nilai, dan analisis siswa untuk kuis ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteKokurikulerQuiz(quizId);
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
