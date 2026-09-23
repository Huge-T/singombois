"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveConclusion } from "./actions";

export function ConclusionForm({
  studentId,
  initialBody,
  status,
  canPublish,
  initialUpdatedAt,
}: {
  studentId: string;
  initialBody: string;
  status: "DRAFT" | "PUBLISHED" | null;
  canPublish: boolean;
  initialUpdatedAt: string | null;
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
        const result = await saveConclusion(studentId, body, publish, updatedAt);
        setUpdatedAt(result.updatedAt);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label htmlFor="body">Kesimpulan akhir untuk siswa</label>
        <textarea
          id="body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Rangkum karakter dan potensi siswa dari ketiga level, dengan bahasa positif yang ditujukan langsung ke siswa, beserta saran cara belajar lanjutannya."
        />
        <p className="hint">
          Rekap mesin di samping hanya alat bantu; kesimpulan sepenuhnya penilaian profesionalmu.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" disabled={pending || !body.trim()} onClick={() => submit(false)}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </button>
        <button type="button" className="btn" disabled={pending || !body.trim() || !canPublish} onClick={() => submit(true)}>
          {pending ? "Memublikasikan..." : status === "PUBLISHED" ? "Perbarui publikasi" : "Publikasikan ke siswa"}
        </button>
        {!canPublish && (
          <span className="hint" style={{ marginTop: 0 }}>
            Publikasi terbuka setelah ketiga level tervalidasi.
          </span>
        )}
        {saved && !pending && <span className="pill pill-ok">TERSIMPAN</span>}
      </div>
    </div>
  );
}
