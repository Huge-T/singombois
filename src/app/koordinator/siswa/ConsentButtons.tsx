"use client";

import { useState, useTransition } from "react";
import { setConsent } from "./actions";

interface TeacherOption {
  id: string;
  name: string;
}

export function ConsentButtons({
  studentId,
  status,
  teachers,
}: {
  studentId: string;
  status: string;
  teachers: TeacherOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [guardianName, setGuardianName] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(granted: boolean, name: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setConsent(studentId, granted, name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan perubahan");
      }
    });
  }

  if (status === "GRANTED") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => submit(false, "Wali murid")}>
          {pending ? "..." : "Cabut"}
        </button>
        {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
      </span>
    );
  }

  if (asking) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <select
          autoFocus
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          style={{ fontSize: 12, padding: "5px 8px" }}
        >
          <option value="">Pilih guru...</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <button className="btn btn-sm" disabled={pending || !guardianName} onClick={() => submit(true, guardianName)}>
          {pending ? "..." : "Setujui"}
        </button>
        {error && <span style={{ color: "var(--measure)", fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  return (
    <button className="btn btn-sm" onClick={() => setAsking(true)}>
      Setujui persetujuan
    </button>
  );
}
