"use client";

import { useActionState, useState } from "react";
import { addStaff, type AddStaffState } from "./actions";

const initial: AddStaffState = {};

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Guru",
  GURU_BK: "Guru BK",
  COORDINATOR: "Koordinator",
};

function randomPassword() {
  // Cukup acak untuk kata sandi awal staf, bukan token kripto sensitif —
  // koordinator melihatnya sekali lalu menyampaikannya langsung ke staf terkait.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaff, initial);
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="form-card" style={{ maxWidth: 480 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      {state.created && (
        <div className="notice-box">
          Akun <b>{state.created.name}</b> ({ROLE_LABEL[state.created.role] ?? state.created.role}) dibuat.
          Sampaikan langsung ke yang bersangkutan: email <b>{state.created.email}</b>, kata sandi awal yang
          baru saja kamu isi. Belum ada fitur ganti sandi mandiri — untuk reset, minta koordinator lain
          membuatkan akun baru.
        </div>
      )}

      <div className="field">
        <label htmlFor="name">Nama</label>
        <input id="name" name="name" required placeholder="Nama lengkap" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="nama@sekolah.sch.id" />
      </div>

      <div className="field">
        <label htmlFor="role">Peran</label>
        <select id="role" name="role" required defaultValue="TEACHER">
          <option value="TEACHER">Guru</option>
          <option value="GURU_BK">Guru BK</option>
          <option value="COORDINATOR">Koordinator</option>
        </select>
        <p className="hint">Akun Admin/Super Admin tidak dibuat dari sini — hubungi pengembang.</p>
      </div>

      <div className="field">
        <label htmlFor="password">Kata sandi awal</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="password"
            name="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPassword(randomPassword())}>
            Buatkan acak
          </button>
        </div>
        <p className="hint">Catat dan sampaikan ke staf yang bersangkutan; tidak ditampilkan ulang setelah ini.</p>
      </div>

      <button className="btn btn-block" disabled={pending}>
        {pending ? "Membuat akun..." : "Buat akun staf"}
      </button>
    </form>
  );
}
