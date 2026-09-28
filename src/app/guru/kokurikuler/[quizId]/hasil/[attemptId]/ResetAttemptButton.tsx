"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetKokurikulerAttempt } from "../../actions";

export function ResetAttemptButton({ quizId, attemptId }: { quizId: string; attemptId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleReset() {
    if (
      !window.confirm(
        "Izinkan siswa mengulang kuis ini? Jawaban, foto, dan nilai yang sudah ada untuk percobaan ini akan dihapus permanen."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await resetKokurikulerAttempt(quizId, attemptId);
        router.push(`/guru/kokurikuler/${quizId}/hasil`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mereset");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" className="btn btn-mark btn-sm" disabled={pending} onClick={handleReset}>
        {pending ? "Memproses..." : "Izinkan mengulang kuis"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--mark)" }}>{error}</span>}
    </span>
  );
}
