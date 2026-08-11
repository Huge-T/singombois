"use client";

import { useState, useTransition } from "react";
import { resetStudentPin } from "./actions";

export function ResetPinButton({ studentId }: { studentId: string }) {
  const [pending, startTransition] = useTransition();
  const [newPin, setNewPin] = useState<string | null>(null);

  if (newPin) {
    return (
      <span style={{ fontFamily: "var(--data)", fontSize: 12, color: "var(--measure)" }}>
        PIN baru: {newPin}
      </span>
    );
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() => startTransition(async () => setNewPin(await resetStudentPin(studentId)))}
    >
      {pending ? "..." : "Atur ulang PIN"}
    </button>
  );
}
