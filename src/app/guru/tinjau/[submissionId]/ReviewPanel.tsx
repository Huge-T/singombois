"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AspectScore } from "@/lib/rubric";
import { saveReview } from "./actions";

export function ReviewPanel({
  submissionId,
  scoreId,
  aspects,
  existingReviews,
  writingContent,
  kappa,
  kappaLabel,
  kappaTone,
  kappaSampleN,
}: {
  submissionId: string;
  scoreId: string;
  aspects: AspectScore[];
  existingReviews: Record<string, number>;
  writingContent: number | null;
  kappa: number | null;
  kappaLabel: string;
  kappaTone: "ok" | "warn" | "bad";
  kappaSampleN: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [decisions, setDecisions] = useState<Record<string, { mode: "agree" | "correct"; value: number }>>(() =>
    Object.fromEntries(
      aspects.map((a) => {
        const existing = existingReviews[a.key];
        return [
          a.key,
          existing !== undefined
            ? { mode: existing === a.score ? "agree" : "correct", value: existing }
            : { mode: "agree", value: a.score as number },
        ];
      })
    )
  );
  const [content, setContent] = useState<string>(writingContent?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  function setAgree(key: string, machineScore: number) {
    setDecisions((d) => ({ ...d, [key]: { mode: "agree", value: machineScore } }));
    setEditingKey(null);
  }

  function setCorrect(key: string, value: number) {
    setDecisions((d) => ({ ...d, [key]: { mode: "correct", value } }));
  }

  function handleSave() {
    startTransition(async () => {
      await saveReview(
        submissionId,
        scoreId,
        aspects.map((a) => ({
          aspect: a.key,
          machineValue: a.score as number,
          teacherValue: decisions[a.key].value,
        })),
        content ? Number(content) : null
      );
      setSaved(true);
      router.push("/guru/tinjau");
    });
  }

  const tone = { ok: "var(--measure)", warn: "var(--warn)", bad: "var(--mark)" }[kappaTone];

  return (
    <div className="rev-side">
      <h5>USULAN MESIN</h5>

      <div className="rev-item">
        <div className="rev-top">
          <span>Menulis · Isi (dinilai guru)</span>
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="0-100"
          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--edge-2)", borderRadius: 3 }}
        />
      </div>

      {aspects.map((a) => {
        const decision = decisions[a.key];
        const isCorrect = decision.mode === "correct";
        return (
          <div className="rev-item" key={a.key} style={isCorrect ? { borderColor: "var(--mark)" } : undefined}>
            <div className="rev-top">
              <span>{a.label}</span>
              <b style={{ color: isCorrect ? "var(--mark)" : "var(--measure)" }}>
                {decision.value.toFixed(0)}
              </b>
            </div>
            <div className="seg">
              <button
                type="button"
                className={!isCorrect ? "on" : ""}
                onClick={() => setAgree(a.key, a.score as number)}
              >
                Setuju
              </button>
              <button
                type="button"
                className={isCorrect ? "on no" : ""}
                onClick={() => setEditingKey(a.key)}
              >
                Koreksi{isCorrect ? ` → ${decision.value.toFixed(0)}` : ""}
              </button>
            </div>
            {editingKey === a.key && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  autoFocus
                  defaultValue={decision.value.toFixed(0)}
                  style={{ width: 70, padding: "5px 8px", border: "1px solid var(--edge-2)", borderRadius: 3 }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const num = Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value)));
                    if (!Number.isNaN(num)) {
                      setCorrect(a.key, num);
                      setEditingKey(null);
                    }
                  }}
                  id={`correct-${a.key}`}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const input = document.getElementById(`correct-${a.key}`) as HTMLInputElement;
                    const num = Math.max(0, Math.min(100, Number(input.value)));
                    if (!Number.isNaN(num)) {
                      setCorrect(a.key, num);
                      setEditingKey(null);
                    }
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p className="kappa" style={{ color: tone }}>
        KESEPAKATAN MESIN-GURU
        <br />
        κ = {kappa === null ? "-" : kappa.toFixed(2)} · {kappaSampleN} PENILAIAN · {kappaLabel}
      </p>

      <button className="btn btn-sm btn-block" style={{ marginTop: 14 }} disabled={pending} onClick={handleSave}>
        {pending ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan & lanjut ke siswa berikutnya"}
      </button>
    </div>
  );
}
