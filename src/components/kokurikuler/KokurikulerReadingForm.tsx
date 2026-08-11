"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface IndicationItem {
  dimension: string;
  title: string;
  detail: string;
}

/**
 * Form penulisan analisis kepribadian per attempt kokurikuler — struktur
 * meng-clone ReadingForm.tsx (bk/[submissionId]) supaya alur draft/publikasi
 * konsisten. saveAction dibawa dari server action milik pemanggil (guru atau
 * BK) supaya pengecekan role tetap terjadi di sisi masing-masing route.
 */
export function KokurikulerReadingForm({
  attemptId,
  initialIndications,
  initialNarrative,
  initialNotes,
  initialStatus,
  saveAction,
  afterPublishHref,
}: {
  attemptId: string;
  initialIndications: IndicationItem[];
  initialNarrative: string;
  initialNotes: string;
  initialStatus: "DRAFT" | "PUBLISHED" | null;
  saveAction: (
    attemptId: string,
    data: { indications: IndicationItem[]; narrative: string; notes: string },
    publish: boolean
  ) => Promise<void>;
  afterPublishHref: string;
}) {
  const [indications, setIndications] = useState<IndicationItem[]>(
    initialIndications.length > 0 ? initialIndications : [{ dimension: "", title: "", detail: "" }]
  );
  const [narrative, setNarrative] = useState(initialNarrative);
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function updateIndication(i: number, field: keyof IndicationItem, value: string) {
    setIndications((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function addIndication() {
    setIndications((prev) => [...prev, { dimension: "", title: "", detail: "" }]);
  }

  function removeIndication(i: number) {
    setIndications((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(publish: boolean) {
    setSaved(false);
    startTransition(async () => {
      await saveAction(attemptId, { indications, narrative, notes }, publish);
      setSaved(true);
      if (publish) router.push(afterPublishHref);
    });
  }

  return (
    <div className="card">
      <p className="tbl-k">INDIKASI PER DIMENSI (OPSIONAL)</p>
      {indications.map((it, i) => (
        <div className="rev-item" key={i}>
          <div className="field">
            <label htmlFor={`dimension-${i}`}>Dimensi</label>
            <input
              id={`dimension-${i}`}
              value={it.dimension}
              onChange={(e) => updateIndication(i, "dimension", e.target.value)}
              placeholder="mis. ketangguhan"
            />
          </div>
          <div className="field">
            <label htmlFor={`title-${i}`}>Judul singkat</label>
            <input
              id={`title-${i}`}
              value={it.title}
              onChange={(e) => updateIndication(i, "title", e.target.value)}
              placeholder="mis. Tidak mudah menyerah"
            />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor={`detail-${i}`}>Penjelasan untuk siswa</label>
            <textarea
              id={`detail-${i}`}
              rows={2}
              value={it.detail}
              onChange={(e) => updateIndication(i, "detail", e.target.value)}
              placeholder="Tulis dengan bahasa positif, ditujukan langsung ke siswa."
            />
          </div>
          {indications.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeIndication(i)}>
              Hapus
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addIndication} style={{ marginBottom: 20 }}>
        + Tambah indikasi
      </button>

      <div className="field">
        <label htmlFor="narrative">Simpulan naratif</label>
        <textarea
          id="narrative"
          rows={4}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Simpulan keseluruhan berdasarkan pola jawaban & jawaban uraian siswa."
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Catatan internal (opsional)</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hanya terlihat oleh guru/BK, bukan siswa."
        />
        <p className="hint">Catatan ini tidak ditampilkan ke siswa.</p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => submit(false)}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </button>
        <button type="button" className="btn" disabled={pending || !narrative.trim()} onClick={() => submit(true)}>
          {pending ? "Memublikasikan..." : "Publikasikan"}
        </button>
        {saved && !pending && (
          <span className="pill pill-ok">{initialStatus === "PUBLISHED" ? "Tersimpan" : "Draf tersimpan"}</span>
        )}
      </div>
    </div>
  );
}
