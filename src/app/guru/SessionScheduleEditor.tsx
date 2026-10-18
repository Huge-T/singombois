"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSessionSchedule } from "./actions";

/** Ubah tanggal & jam buka/tutup sesi (WIB) langsung dari kartu sesi. */
export function SessionScheduleEditor({
  sessionId,
  initialOpensAt,
  initialClosesAt,
  needsReopen,
}: {
  sessionId: string;
  initialOpensAt: string;
  initialClosesAt: string;
  /** true bila sesi ditutup atau waktu tutupnya sudah lewat: simpan = buka lagi. */
  needsReopen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [opensAt, setOpensAt] = useState(initialOpensAt);
  const [closesAt, setClosesAt] = useState(initialClosesAt);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateSessionSchedule(sessionId, opensAt, closesAt);
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
    <div style={{ marginTop: 12 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Tutup pengaturan jadwal" : needsReopen ? "Ubah jadwal & buka lagi" : "Ubah jadwal"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {needsReopen && (
            <p className="hint" style={{ marginBottom: 10 }}>
              Sesi ini sudah ditutup atau waktunya sudah lewat. Pilih waktu tutup yang baru lalu klik &quot;Simpan &amp;
              buka lagi&quot; agar siswa yang belum mengumpulkan bisa melanjutkan.
            </p>
          )}
          {message && <div className={message.kind === "ok" ? "notice-box" : "error-box"}>{message.text}</div>}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end" }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`buka-${sessionId}`}>Dibuka (WIB)</label>
              <input
                id={`buka-${sessionId}`}
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`tutup-${sessionId}`}>Ditutup (WIB)</label>
              <input
                id={`tutup-${sessionId}`}
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={submit}>
              {pending ? "Menyimpan..." : needsReopen ? "Simpan & buka lagi" : "Simpan jadwal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
