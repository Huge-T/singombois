"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetKokurikulerAttempt } from "../../actions";

/** Buka ulang seluruh soal objektif untuk siswa ini (esai foto tidak berubah). */
export function ResetAttemptButton({ quizId, attemptId }: { quizId: string; attemptId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleReset() {
    if (
      !window.confirm(
        "Izinkan siswa ini mengulang SELURUH soal pilihan ganda/benar-salah? Jawaban objektifnya akan dihapus dan nilainya dihitung ulang setelah ia mengumpulkan lagi. Foto jawaban uraian tidak terpengaruh."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await resetKokurikulerAttempt(quizId, attemptId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mereset");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button type="button" className="btn btn-mark btn-sm" disabled={pending} onClick={handleReset}>
        {pending ? "..." : "Ulangi seluruh kuis"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--mark)" }}>{error}</span>}
    </span>
  );
}
