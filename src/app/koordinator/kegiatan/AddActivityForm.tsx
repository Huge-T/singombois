"use client";

import { useActionState } from "react";
import { createActivity, type ActivityFormState } from "./actions";

const initial: ActivityFormState = {};

export function AddActivityForm() {
  const [state, action, pending] = useActionState(createActivity, initial);
  const currentYear = new Date().getFullYear();

  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      <div className="field">
        <label htmlFor="title">Judul kegiatan</label>
        <input id="title" name="title" placeholder="Sosialisasi SINGO MBOIS kepada siswa" required />
      </div>
      <div className="field">
        <label htmlFor="category">Kategori</label>
        <input id="category" name="category" placeholder="sosialisasi, tes awal, literasi, ..." required />
      </div>
      <div className="field">
        <label htmlFor="year">Tahun</label>
        <input id="year" name="year" type="number" defaultValue={currentYear} min={2000} max={2100} required />
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>
        Setelah kegiatan dibuat, unggah foto dokumentasinya lewat kartu di bawah.
      </p>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah kegiatan"}
      </button>
    </form>
  );
}
