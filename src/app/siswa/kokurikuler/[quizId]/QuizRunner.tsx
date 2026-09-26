"use client";

import { useState, useTransition } from "react";
import { submitKokurikulerAttempt, type SubmitKokurikulerState } from "../actions";
import { compressImageForUpload } from "@/lib/clientImageCompress";

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuestionForStudent {
  id: string;
  order: number;
  type: "PILIHAN_GANDA" | "BENAR_SALAH" | "URAIAN";
  text: string;
  optionsJson: string | null;
}

interface PhotoState {
  status: "idle" | "uploading" | "accepted" | "rejected";
  error?: string;
}

export function QuizRunner({
  quizId,
  questions,
  usesPhotoEssay,
  initialAccepted,
}: {
  quizId: string;
  questions: QuestionForStudent[];
  usesPhotoEssay: boolean;
  initialAccepted: string[]; // id soal URAIAN yang sudah punya foto diterima
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photoKind, setPhotoKind] = useState<Record<string, "TULISAN" | "GAMBAR">>({});
  const [photos, setPhotos] = useState<Record<string, PhotoState>>(() => {
    const init: Record<string, PhotoState> = {};
    for (const qId of initialAccepted) init[qId] = { status: "accepted" };
    return init;
  });
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SubmitKokurikulerState>({});

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handlePhotoSelect(questionId: string, file: File) {
    setPhotos((prev) => ({ ...prev, [questionId]: { status: "uploading" } }));
    try {
      const compressed = await compressImageForUpload(file);
      if (compressed.size > 4 * 1024 * 1024) {
        setPhotos((prev) => ({
          ...prev,
          [questionId]: {
            status: "rejected",
            error: "Foto terlalu besar dan tidak bisa dikompres otomatis. Coba format JPG/PNG lain.",
          },
        }));
        return;
      }
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("kind", photoKind[questionId] ?? "TULISAN");
      const res = await fetch(`/api/kokurikuler-upload/${quizId}/${questionId}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        const flagMsg = Array.isArray(data.flags)
          ? data.flags.map((f: { message: string }) => f.message).join(" ")
          : null;
        setPhotos((prev) => ({
          ...prev,
          [questionId]: { status: "rejected", error: flagMsg || data.error || "Foto ditolak, coba unggah ulang." },
        }));
        return;
      }
      setPhotos((prev) => ({ ...prev, [questionId]: { status: "accepted" } }));
    } catch {
      setPhotos((prev) => ({
        ...prev,
        [questionId]: { status: "rejected", error: "Terjadi kesalahan tak terduga. Coba unggah ulang." },
      }));
    }
  }

  const uraianQuestions = questions.filter((q) => q.type === "URAIAN");
  const allPhotosAccepted = !usesPhotoEssay || uraianQuestions.every((q) => photos[q.id]?.status === "accepted");

  function submit() {
    startTransition(async () => {
      const payload = questions
        .filter((q) => !(usesPhotoEssay && q.type === "URAIAN"))
        .map((q) => ({ questionId: q.id, answerText: answers[q.id] ?? "" }));
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
        const photo = photos[q.id];
        return (
          <div className="card" key={q.id} style={{ marginBottom: 12 }}>
            <p>
              <strong>
                {q.order}. {q.text}
              </strong>
            </p>
            {q.type === "PILIHAN_GANDA" && (
              <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                {options.map((opt, i) => (
                  <label key={i} className="opt">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === OPTION_LETTERS[i]}
                      onChange={() => setAnswer(q.id, OPTION_LETTERS[i])}
                    />
                    {OPTION_LETTERS[i]}. {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === "BENAR_SALAH" && (
              <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                {["BENAR", "SALAH"].map((v) => (
                  <label key={v} className="opt">
                    <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} />
                    {v}
                  </label>
                ))}
              </div>
            )}
            {q.type === "URAIAN" && usesPhotoEssay && (
              <div>
                <p className="hint">Jenis karya</p>
                <div className="seg" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className={(photoKind[q.id] ?? "TULISAN") === "TULISAN" ? "on" : ""}
                    disabled={photo?.status === "uploading"}
                    onClick={() => setPhotoKind((prev) => ({ ...prev, [q.id]: "TULISAN" }))}
                  >
                    Tulisan
                  </button>
                  <button
                    type="button"
                    className={photoKind[q.id] === "GAMBAR" ? "on" : ""}
                    disabled={photo?.status === "uploading"}
                    onClick={() => setPhotoKind((prev) => ({ ...prev, [q.id]: "GAMBAR" }))}
                  >
                    Gambar
                  </button>
                </div>
                <p className="hint">
                  {photoKind[q.id] === "GAMBAR"
                    ? "Gambar dibaca langsung oleh tim ahli, tanpa skor kerapian teknis."
                    : "Tulis jawabanmu di lembar kerja, lalu foto dan unggah di sini."}
                </p>
                <p className="hint">
                  Foto di tempat terang, kamera tegak lurus di atas kertas, seluruh lembar masuk bingkai.
                </p>
                <label className="btn" style={{ cursor: photo?.status === "uploading" ? "not-allowed" : "pointer" }}>
                  {photo?.status === "accepted" ? "Ganti foto" : "Pilih atau foto lembar jawaban"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif"
                    capture="environment"
                    disabled={photo?.status === "uploading"}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoSelect(q.id, file);
                    }}
                  />
                </label>
                {photo?.status === "uploading" && <p className="hint">Mengunggah &amp; menganalisis...</p>}
                {photo?.status === "accepted" && <div className="notice-box">Foto diterima.</div>}
                {photo?.status === "rejected" && <div className="error-box">{photo.error}</div>}
              </div>
            )}
            {q.type === "URAIAN" && !usesPhotoEssay && (
              <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                <textarea
                  rows={4}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Tulis jawabanmu..."
                />
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-block" disabled={pending || !allPhotosAccepted} onClick={submit}>
        {pending ? "Mengirim..." : "Kumpulkan jawaban"}
      </button>
      {usesPhotoEssay && !allPhotosAccepted && (
        <p className="hint">Unggah foto jawaban untuk semua soal uraian dulu sebelum mengumpulkan.</p>
      )}
    </div>
  );
}
