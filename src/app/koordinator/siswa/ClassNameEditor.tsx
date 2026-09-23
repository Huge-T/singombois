"use client";

import { useState, useTransition } from "react";
import { renameClass } from "./actions";

export function ClassNameEditor({ classId, name }: { classId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await renameClass(classId, value);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
      >
        Ganti nama
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: 120, padding: "4px 8px", fontSize: 13 }}
        disabled={pending}
        autoFocus
      />
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
