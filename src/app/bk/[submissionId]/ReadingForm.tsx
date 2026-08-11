"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReading, type StrengthItem } from "./actions";

export function ReadingForm({
  submissionId,
  initialStrengths,
  initialLearningSuggestions,
  initialNotes,
  initialStatus,
}: {
  submissionId: string;
  initialStrengths: StrengthItem[];
  initialLearningSuggestions: string;
  initialNotes: string;
  initialStatus: "DRAFT" | "PUBLISHED" | null;
}) {
  const [strengths, setStrengths] = useState<StrengthItem[]>(
    initialStrengths.length > 0 ? initialStrengths : [{ title: "", detail: "" }]
  );
  const [learningSuggestions, setLearningSuggestions] = useState(initialLearningSuggestions);
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function updateStrength(i: number, field: keyof StrengthItem, value: string) {
    setStrengths((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function addStrength() {
    setStrengths((prev) => [...prev, { title: "", detail: "" }]);
  }

  function removeStrength(i: number) {
    setStrengths((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(publish: boolean) {
    setSaved(false);
    startTransition(async () => {
      await saveReading(submissionId, { strengths, learningSuggestions, notes }, publish);
      setSaved(true);
      if (publish) router.push("/bk");
    });
  }

  return (
    <div className="card">
      <p className="tbl-k">POTENSI POSITIF</p>
      {strengths.map((s, i) => (
        <div className="rev-item" key={i}>
          <div className="field">
            <label htmlFor={`title-${i}`}>Judul singkat</label>
            <input
              id={`title-${i}`}
              value={s.title}
              onChange={(e) => updateStrength(i, "title", e.target.value)}
              placeholder="mis. Teliti dan suka menyimak detail"
            />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor={`detail-${i}`}>Penjelasan untuk siswa</label>
            <textarea
              id={`detail-${i}`}
              rows={2}
              value={s.detail}
              onChange={(e) => updateStrength(i, "detail", e.target.value)}
              placeholder="Tulis dengan bahasa positif, ditujukan langsung ke siswa."
            />
          </div>
          {strengths.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStrength(i)}>
              Hapus
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addStrength} style={{ marginBottom: 20 }}>
        + Tambah potensi
      </button>

      <div className="field">
        <label htmlFor="saran">Saran cara belajar</label>
        <textarea
          id="saran"
          rows={4}
          value={learningSuggestions}
          onChange={(e) => setLearningSuggestions(e.target.value)}
          placeholder="Saran konkret yang bisa langsung dicoba siswa minggu ini."
        />
      </div>

      <div className="field">
        <label htmlFor="catatan">Catatan internal (opsional, boleh memuat sisi yang perlu perhatian)</label>
        <textarea
          id="catatan"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hanya terlihat oleh tim BK, bukan siswa."
        />
        <p className="hint">Catatan ini tidak ditampilkan ke siswa.</p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => submit(false)}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending || !learningSuggestions.trim()}
          onClick={() => submit(true)}
        >
          {pending ? "Memublikasikan..." : "Publikasikan ke siswa"}
        </button>
        {saved && !pending && (
          <span className="pill pill-ok">
            {initialStatus === "PUBLISHED" ? "Tersimpan" : "Draf tersimpan"}
          </span>
        )}
      </div>
    </div>
  );
}
