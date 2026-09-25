"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createKokurikulerQuiz, type CreateQuizState } from "./actions";

interface Option {
  id: string;
  label: string;
}

interface StudentOption {
  id: string;
  name: string;
  classId: string;
}

const initialState: CreateQuizState = {};

export function CreateQuizForm({ classes, students }: { classes: Option[]; students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState(createKokurikulerQuiz, initialState);
  const [classIds, setClassIds] = useState<string[]>(classes[0] ? [classes[0].id] : []);
  const [pilihSiswa, setPilihSiswa] = useState(false);

  const classStudents = useMemo(
    () => (classIds.length === 1 ? students.filter((s) => s.classId === classIds[0]) : []),
    [students, classIds]
  );

  function toggleClass(id: string) {
    setClassIds((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      if (next.length !== 1) setPilihSiswa(false);
      return next;
    });
  }

  return (
    <form action={formAction} className="form-card" style={{ maxWidth: 560 }}>
      {state.error && <div className="error-box">{state.error}</div>}

      <div className="field">
        <label htmlFor="label">Nama kuis</label>
        <input id="label" name="label" placeholder="mis. Asesmen Sumatif Kokurikuler Tema GEMATI" required />
      </div>

      <div className="field">
        <label htmlFor="tema">Tema (opsional)</label>
        <input id="tema" name="tema" placeholder="mis. GEMATI" />
      </div>

      <div className="field">
        <label>Kelas (bisa pilih lebih dari satu — kuis yang sama dibuat untuk tiap kelas)</label>
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid var(--garis)",
            borderRadius: 2,
            padding: "8px 12px",
          }}
        >
          {classes.map((c) => (
            <label key={c.id} className="opt" style={{ marginBottom: 4 }}>
              <input type="checkbox" name="classIds" value={c.id} checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
              {c.label}
            </label>
          ))}
          {classes.length === 0 && <p className="hint">Belum ada kelas.</p>}
        </div>
        {classIds.length === 0 && <p className="hint">Pilih minimal satu kelas.</p>}
      </div>

      {classIds.length === 1 && (
        <div className="field">
          <label className="opt" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={pilihSiswa} onChange={(e) => setPilihSiswa(e.target.checked)} />
            Hanya untuk siswa tertentu
          </label>
          {pilihSiswa && (
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid var(--garis)",
                borderRadius: 2,
                padding: "8px 12px",
                marginTop: 8,
              }}
            >
              {classStudents.map((s) => (
                <label key={s.id} className="opt" style={{ marginBottom: 4 }}>
                  <input type="checkbox" name="studentIds" value={s.id} />
                  {s.name}
                </label>
              ))}
              {classStudents.length === 0 && <p className="hint">Tidak ada siswa di kelas ini.</p>}
            </div>
          )}
          {!pilihSiswa && <p className="hint">Tanpa dicentang, kuis berlaku untuk seluruh siswa kelas.</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="opensAt">Dibuka</label>
        <input id="opensAt" name="opensAt" type="datetime-local" required />
      </div>
      <div className="field">
        <label htmlFor="closesAt">Ditutup</label>
        <input id="closesAt" name="closesAt" type="datetime-local" required />
      </div>

      <button className="btn btn-block" type="submit" disabled={pending || classIds.length === 0}>
        {pending
          ? "Membuat..."
          : classIds.length > 1
            ? `Buat ${classIds.length} kuis untuk tiap kelas`
            : "Buat kuis & lanjut unggah soal"}
      </button>
    </form>
  );
}
