"use client";

import { useTransition } from "react";
import { markExerciseDone } from "./actions";

export function MarkDoneButton({ assignmentId }: { assignmentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-sm"
      disabled={pending}
      onClick={() => startTransition(() => markExerciseDone(assignmentId))}
    >
      {pending ? "Menyimpan..." : "Tandai selesai"}
    </button>
  );
}
