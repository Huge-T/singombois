"use client";

import { useTransition } from "react";
import { toggleAudioQc } from "./actions";

export function AudioQcButton({ audioId, qcPassed }: { audioId: string; qcPassed: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={`btn btn-sm ${qcPassed ? "btn-ghost" : ""}`}
      disabled={pending}
      onClick={() => startTransition(() => toggleAudioQc(audioId, !qcPassed))}
    >
      {pending ? "..." : qcPassed ? "Batalkan lolos QC" : "Tandai lolos uji dengar"}
    </button>
  );
}
