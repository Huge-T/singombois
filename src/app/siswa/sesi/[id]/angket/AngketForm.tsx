"use client";

import { useActionState } from "react";
import { submitAngket, type AngketFormState } from "./actions";
import { StarRatingInput } from "@/components/StarRatingInput";

const initialState: AngketFormState = {};

export function AngketForm({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: {
    awareness: string;
    clarityScore: number;
    impression: string;
    suggestion: string;
    displayConsent: string;
  } | null;
}) {
  const action = submitAngket.bind(null, sessionId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card" style={{ maxWidth: 640 }}>
      {state.error && <div className="error-box">{state.error}</div>}

      <div className="field">
        <label>Beri rating pengalamanmu ikut SINGO MBOIS</label>
        <StarRatingInput name="clarityScore" initial={initial?.clarityScore} />
        <p className="hint">1 bintang = kurang membantu · 5 bintang = sangat membantu</p>
      </div>

      <div className="field">
        <label htmlFor="impression">Tulis ulasanmu</label>
        <textarea
          id="impression"
          name="impression"
          rows={3}
          defaultValue={initial?.impression}
          placeholder="Ceritakan satu hal yang paling berkesan setelah ikut SINGO MBOIS..."
          required
        />
        <p className="hint">Ulasan ini yang bisa tampil di situs (sesuai pilihanmu di bawah).</p>
      </div>

      <div className="field">
        <label>Sebelum ikut SINGO MBOIS, kamu tahu tidak kalau cara belajarmu bisa dibaca dari tulisan tangan?</label>
        {[
          { value: "TAHU", label: "Tahu, dan sudah tahu caranya" },
          { value: "PERNAH_DENGAR", label: "Pernah dengar, tapi belum paham" },
          { value: "TIDAK_TAHU", label: "Tidak tahu sama sekali" },
        ].map((o) => (
          <label key={o.value} className="opt">
            <input type="radio" name="awareness" value={o.value} defaultChecked={initial?.awareness === o.value} required />
            {o.label}
          </label>
        ))}
      </div>

      <div className="field">
        <label htmlFor="suggestion">Ada yang perlu diperbaiki atau ditambahkan? (opsional)</label>
        <textarea id="suggestion" name="suggestion" rows={2} defaultValue={initial?.suggestion} />
        <p className="hint">Hanya dibaca tim, tidak ditampilkan ke publik.</p>
      </div>

      <div className="field">
        <label>Bolehkah kami menampilkan ulasanmu di situs SINGO MBOIS?</label>
        {[
          { value: "DENGAN_NAMA", label: "Ya, boleh, dan nama saya boleh dicantumkan" },
          { value: "ANONIM", label: "Ya, boleh, tapi tanpa nama (anonim)" },
          { value: "TIDAK", label: "Tidak boleh ditampilkan" },
        ].map((o) => (
          <label key={o.value} className="opt">
            <input type="radio" name="displayConsent" value={o.value} defaultChecked={initial?.displayConsent === o.value} required />
            {o.label}
          </label>
        ))}
      </div>

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "Mengirim..." : initial ? "Perbarui ulasan" : "Kirim ulasan"}
      </button>
    </form>
  );
}
