"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKokurikulerQuizSchedule } from "./actions";

/** Ubah tanggal & jam buka/tutup kuis (WIB). Untuk kuis yang sudah tutup atau lewat waktu, tombol utama sekaligus membuka kembali. */
export function ScheduleForm({
  quizId,
  initialOpensAt,
  initialClosesAt,
  needsReopen,
}: {
  quizId: string;
  initialOpensAt: string;
  initialClosesAt: string;
  /** true bila kuis ditutup manual atau waktu tutupnya sudah lewat: simpan = buka lagi. */
  needsReopen: boolean;
}) {
  const [opensAt, setOpensAt] = useState(initialOpensAt);
  const [closesAt, setClosesAt] = useState(initialClosesAt);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateKokurikulerQuizSchedule(quizId, opensAt, closesAt, needsReopen);
        if (result.error) setMessage({ kind: "error", text: result.error });
        else {
          setMessage({ kind: "ok", text: result.ok ?? "Tersimpan." });
          router.refresh();
        }
      } catch (e) {
        setMessage({ kind: "error", text: e instanceof Error ? e.message : "Gagal menyimpan jadwal" });
      }
    });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <p className="tbl-k">JADWAL PENGERJAAN (WIB)</p>
      {needsReopen && (
        <p className="hint" style={{ marginBottom: 10 }}>
          Kuis ini sudah ditutup atau waktunya sudah lewat, sehingga siswa belum bisa mengerjakan. Pilih waktu tutup
          yang baru lalu klik &quot;Simpan &amp; buka lagi&quot; — siswa yang belum mengumpulkan bisa melanjutkan, yang
          sudah mengumpulkan tidak berubah.
        </p>
      )}
      {message && <div className={message.kind === "ok" ? "notice-box" : "error-box"}>{message.text}</div>}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end" }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="jadwalBuka">Dibuka</label>
          <input id="jadwalBuka" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="jadwalTutup">Ditutup</label>
          <input id="jadwalTutup" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </div>
        <button type="button" className="btn" disabled={pending} onClick={submit}>
          {pending ? "Menyimpan..." : needsReopen ? "Simpan & buka lagi" : "Simpan jadwal"}
        </button>
      </div>
    </div>
  );
}
