"use client";

import { useState, useTransition } from "react";
import { setHomeroomTeacher } from "./actions";

interface TeacherOption {
  id: string;
  name: string;
}

export function HomeroomTeacherEditor({
  classId,
  currentTeacherId,
  currentTeacherName,
  teachers,
}: {
  classId: string;
  currentTeacherId: string | null;
  currentTeacherName: string | null;
  teachers: TeacherOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentTeacherId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await setHomeroomTeacher(classId, value || null);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  if (!editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
        <span className="hint">Wali kelas: {currentTeacherName ?? "belum ditentukan"}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setValue(currentTeacherId ?? "");
            setEditing(true);
          }}
        >
          Atur wali kelas
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <select value={value} onChange={(e) => setValue(e.target.value)} disabled={pending} style={{ fontSize: 13 }}>
        <option value="">Tidak ada</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={save}>
        {pending ? "..." : "Simpan"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setEditing(false)}>
        Batal
      </button>
      {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
