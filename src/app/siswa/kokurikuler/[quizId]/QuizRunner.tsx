"use client";

import { useState, useTransition } from "react";
import { submitKokurikulerAttempt, type SubmitKokurikulerState } from "../actions";

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuestionForStudent {
  id: string;
  order: number;
  type: "PILIHAN_GANDA" | "BENAR_SALAH" | "URAIAN";
  text: string;
  optionsJson: string | null;
}

export function QuizRunner({ quizId, questions }: { quizId: string; questions: QuestionForStudent[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SubmitKokurikulerState>({});

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function submit() {
    startTransition(async () => {
      const payload = questions.map((q) => ({ questionId: q.id, answerText: answers[q.id] ?? "" }));
      const res = await submitKokurikulerAttempt(quizId, payload);
      setResult(res);
    });
  }

  if (result.ok) {
    return <div className="notice-box">Terkirim, menunggu dinilai gurumu.</div>;
  }

  return (
    <div>
      {result.error && <div className="error-box">{result.error}</div>}
      {questions.map((q) => {
        const options: string[] = q.optionsJson ? JSON.parse(q.optionsJson) : [];
        return (
          <div className="card" key={q.id} style={{ marginBottom: 12 }}>
            <p>
              <strong>
                {q.order}. {q.text}
              </strong>
            </p>
            {q.type === "PILIHAN_GANDA" &&
              options.map((opt, i) => (
                <label key={i} className="opt" style={{ display: "block", marginBottom: 4 }}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === OPTION_LETTERS[i]}
                    onChange={() => setAnswer(q.id, OPTION_LETTERS[i])}
                  />
                  {OPTION_LETTERS[i]}. {opt}
                </label>
              ))}
            {q.type === "BENAR_SALAH" &&
              ["BENAR", "SALAH"].map((v) => (
                <label key={v} className="opt" style={{ display: "block", marginBottom: 4 }}>
                  <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} />
                  {v}
                </label>
              ))}
            {q.type === "URAIAN" && (
              <textarea
                rows={4}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Tulis jawabanmu..."
              />
            )}
          </div>
        );
      })}
      <button className="btn btn-block" disabled={pending} onClick={submit}>
        {pending ? "Mengirim..." : "Kumpulkan jawaban"}
      </button>
    </div>
  );
}
