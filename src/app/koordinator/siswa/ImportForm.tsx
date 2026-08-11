"use client";

import { useActionState } from "react";
import { importStudentsCsv, type ImportState } from "./actions";

const initial: ImportState = {};

export function ImportForm({ classes }: { classes: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(importStudentsCsv, initial);

  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      {state.createdCount !== undefined && (
        <div className="notice-box">
          {state.createdCount} siswa ditambahkan, {state.skippedCount} dilewati (NISN kosong/duplikat).
        </div>
      )}
      <div className="field">
        <label htmlFor="classId">Kelas tujuan</label>
        <select id="classId" name="classId" required>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="file">Berkas CSV</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="hint">Kolom wajib: nama, nisn. PIN awal semua siswa baru: 1234.</p>
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Mengimpor..." : "Impor siswa"}
      </button>
    </form>
  );
}
