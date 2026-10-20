"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryBelowThreshold } from "../../actions";

export function RetryButton({ quizId, label }: { quizId: string; label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryBelowThreshold(quizId);
      if (result.error) setError(result.error);
      else router.push(`/siswa/kokurikuler/${quizId}`);
    });
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="btn" disabled={pending} onClick={handleRetry}>
        {pending ? "Membuka soal..." : label}
      </button>
    </div>
  );
}
