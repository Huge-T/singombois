"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveConclusion } from "./actions";

export function ConclusionForm({
  studentId,
  academicYearId,
  yearLabel,
  initialBody,
  status,
  canPublish,
  initialUpdatedAt,
  draft,
}: {
  studentId: string;
  academicYearId: string;
  yearLabel: string;
  initialBody: string;
  status: "DRAFT" | "PUBLISHED" | null;
  canPublish: boolean;
  initialUpdatedAt: string | null;
  /** Draf otomatis dari hasil tahun ini (kosong bila belum ada level tervalidasi). */
  draft: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(publish: boolean) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveConclusion(studentId, academicYearId, body, publish, updatedAt);
        setUpdatedAt(result.updatedAt);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  function fillDraft() {
    if (body.trim() && !window.confirm("Isi kesimpulan yang sudah ada akan diganti dengan draf. Lanjutkan?")) return;
    setBody(draft);
    setSaved(false);
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label htmlFor="body">Kesimpulan tahun ajaran {yearLabel} untuk siswa</label>
        <textarea
          id="body"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Rangkum karakter dan potensi siswa di tahun ajaran ini, dengan bahasa positif yang ditujukan langsung ke siswa, beserta saran cara belajar lanjutannya."
        />
        <p className="hint">
          Rekap di samping hanya alat bantu; kesimpulan sepenuhnya penilaian profesionalmu. Draf otomatis hanya titik
          awal: baca, ubah sesuai pengamatanmu, lalu terbitkan sendiri.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" disabled={pending || !draft} onClick={fillDraft}>
          Isi draf dari hasil tahun ini
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending || !body.trim()} onClick={() => submit(false)}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </button>
        <button type="button" className="btn" disabled={pending || !body.trim() || !canPublish} onClick={() => submit(true)}>
          {pending ? "Memublikasikan..." : status === "PUBLISHED" ? "Perbarui publikasi" : "Publikasikan ke siswa"}
        </button>
        {!draft && (
          <span className="hint" style={{ marginTop: 0 }}>
            Draf tersedia setelah ada level yang tervalidasi di tahun ini.
          </span>
        )}
        {!canPublish && (
          <span className="hint" style={{ marginTop: 0 }}>
            Publikasi terbuka setelah minimal satu level tervalidasi di tahun ini.
          </span>
        )}
        {saved && !pending && <span className="pill pill-ok">TERSIMPAN</span>}
      </div>
    </div>
  );
}
