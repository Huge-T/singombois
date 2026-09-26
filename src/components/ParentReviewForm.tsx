"use client";

import { useActionState, useState } from "react";
import { submitParentReview, type SubmitParentReviewState } from "@/app/parentReviewActions";
import { StarRatingInput } from "@/components/StarRatingInput";

const initialState: SubmitParentReviewState = {};

export function ParentReviewForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitParentReview, initialState);

  if (state.ok) {
    return <div className="notice-box">Terima kasih, ulasan Anda sudah terkirim dan menunggu moderasi tim.</div>;
  }

  if (!open) {
    return (
      <button type="button" className="tombol tombol-utama tombol-kecil" onClick={() => setOpen(true)}>
        Beri ulasan
      </button>
    );
  }

  return (
    <form action={formAction} className="kartu" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}

      {/* Honeypot anti-bot: kolom tersembunyi dari manusia (bot pengisi otomatis sering isi ini). */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />

      <div className="field">
        <label htmlFor="pr-name">Nama Anda</label>
        <input id="pr-name" name="name" maxLength={100} required />
      </div>

      <div className="field">
        <label>Penilaian</label>
        <StarRatingInput name="rating" />
      </div>

      <div className="field">
        <label htmlFor="pr-comment">Ulasan Anda</label>
        <textarea
          id="pr-comment"
          name="comment"
          rows={3}
          minLength={10}
          maxLength={500}
          placeholder="Ceritakan pengalaman Anda sebagai orang tua/wali murid siswa yang ikut SINGO MBOIS..."
          required
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="tombol tombol-utama tombol-kecil" type="submit" disabled={pending}>
          {pending ? "Mengirim..." : "Kirim ulasan"}
        </button>
        <button type="button" className="tombol tombol-kecil" onClick={() => setOpen(false)} disabled={pending}>
          Batal
        </button>
      </div>
    </form>
  );
}
