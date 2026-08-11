"use client";

import { useActionState } from "react";
import { addAudioMaterial, addReadingText, addWorksheetTemplate, type MateriFormState } from "./actions";

const initial: MateriFormState = {};

export function ReadingTextForm() {
  const [state, action, pending] = useActionState(addReadingText, initial);
  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      <div className="field">
        <label htmlFor="title">Judul</label>
        <input id="title" name="title" required />
      </div>
      <div className="field">
        <label htmlFor="theme">Tema</label>
        <input id="theme" name="theme" placeholder="Lingkungan, Kesehatan, ..." />
      </div>
      <div className="field">
        <label htmlFor="gradeLevel">Tingkat kelas</label>
        <select id="gradeLevel" name="gradeLevel" defaultValue="7">
          <option value="7">VII</option>
          <option value="8">VIII</option>
          <option value="9">IX</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="estMinutes">Estimasi waktu baca (menit)</label>
        <input id="estMinutes" name="estMinutes" type="number" defaultValue={4} min={1} />
      </div>
      <div className="field">
        <label htmlFor="body">Isi bacaan</label>
        <textarea id="body" name="body" rows={6} required />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah teks bacaan"}
      </button>
    </form>
  );
}

export function AudioMaterialForm() {
  const [state, action, pending] = useActionState(addAudioMaterial, initial);
  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      <div className="field">
        <label htmlFor="a-title">Judul</label>
        <input id="a-title" name="title" required />
      </div>
      <div className="field">
        <label htmlFor="transcript">Transkrip</label>
        <textarea id="transcript" name="transcript" rows={4} required />
        <p className="hint">Ditampilkan ke guru selalu; ke siswa hanya setelah menjawab (AUD-5).</p>
      </div>
      <div className="field">
        <label htmlFor="file">Berkas audio</label>
        <input id="file" name="file" type="file" accept="audio/*" required />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Mengunggah..." : "Unggah audio"}
      </button>
    </form>
  );
}

export function WorksheetTemplateForm() {
  const [state, action, pending] = useActionState(addWorksheetTemplate, initial);
  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      <div className="field">
        <label htmlFor="name">Nama template</label>
        <input id="name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="lineHeightMm">Jarak garis (mm)</label>
        <input id="lineHeightMm" name="lineHeightMm" type="number" defaultValue={8} step="0.5" />
      </div>
      <div className="field">
        <label htmlFor="minWords">Minimal kata untuk dinilai</label>
        <input id="minWords" name="minWords" type="number" defaultValue={20} />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah template"}
      </button>
    </form>
  );
}
