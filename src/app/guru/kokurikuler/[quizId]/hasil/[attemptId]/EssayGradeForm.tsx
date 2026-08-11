"use client";

import { useActionState } from "react";
import { saveEssayScore, type SaveEssayState } from "./actions";

const initialState: SaveEssayState = {};

export function EssayGradeForm({ attemptId, initialScore }: { attemptId: string; initialScore: number | null }) {
  const action = saveEssayScore.bind(null, attemptId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-card" style={{ maxWidth: 320 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      {state.saved && !state.error && <div className="notice-box">Nilai esai tersimpan.</div>}
      <div className="field">
        <label htmlFor="essayScore">Nilai esai (0-100)</label>
        <input
          id="essayScore"
          name="essayScore"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={initialScore ?? undefined}
          required
        />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan nilai esai"}
      </button>
    </form>
  );
}
