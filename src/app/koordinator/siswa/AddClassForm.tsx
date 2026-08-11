"use client";

import { useActionState } from "react";
import { addClass, type AddClassState } from "./actions";

const initial: AddClassState = {};

export function AddClassForm() {
  const [state, action, pending] = useActionState(addClass, initial);

  return (
    <form action={action} className="form-card" style={{ maxWidth: 360 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      {state.createdName && (
        <div className="notice-box">
          Kelas <b>{state.createdName}</b> dibuat. Impor siswa ke kelas ini lewat form di bawah.
        </div>
      )}
      <div className="field">
        <label htmlFor="className">Nama kelas</label>
        <input id="className" name="name" required placeholder="mis. VII-D" />
      </div>
      <div className="field">
        <label htmlFor="grade">Tingkat</label>
        <select id="grade" name="grade" required defaultValue="7">
          <option value="7">Kelas VII</option>
          <option value="8">Kelas VIII</option>
          <option value="9">Kelas IX</option>
        </select>
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Membuat..." : "Buat kelas"}
      </button>
    </form>
  );
}
