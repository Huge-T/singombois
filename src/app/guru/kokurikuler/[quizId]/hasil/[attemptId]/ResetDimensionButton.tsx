"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetKokurikulerDimension } from "../../actions";

export function ResetDimensionButton({
  quizId,
  attemptId,
  dimension,
}: {
  quizId: string;
  attemptId: string;
  dimension: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleReset() {
    if (
      !window.confirm(
        `Izinkan siswa mengulang soal dimensi "${dimension}" saja? Jawaban dimensi ini akan dihapus; dimensi dan esai lain tidak terpengaruh.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await resetKokurikulerDimension(quizId, attemptId, dimension);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mereset");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="btn btn-mark btn-sm" disabled={pending} onClick={handleReset}>
        {pending ? "..." : "Ulangi dimensi ini"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--mark)" }}>{error}</span>}
    </span>
  );
}
