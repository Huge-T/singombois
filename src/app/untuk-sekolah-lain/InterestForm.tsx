"use client";

import { useActionState } from "react";
import { submitInterest, type ContactFormState } from "./actions";

const initialState: ContactFormState = { ok: false };

export function InterestForm() {
  const [state, formAction, pending] = useActionState(submitInterest, initialState);

  if (state.ok) {
    return (
      <div className="notice-box">
        Terkirim. Tim SINGO MBOIS akan menghubungi sekolah Anda lewat email yang didaftarkan.
      </div>
    );
  }

  return (
    <form action={formAction} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      <div className="field">
        <label htmlFor="schoolName">Nama sekolah</label>
        <input id="schoolName" name="schoolName" required />
      </div>
      <div className="field">
        <label htmlFor="contactName">Nama kontak</label>
        <input id="contactName" name="contactName" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="message">Kebutuhan / pertanyaan</label>
        <textarea id="message" name="message" rows={4} required />
      </div>
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "Mengirim..." : "Kirim minat adopsi"}
      </button>
    </form>
  );
}
