"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createSession, type CreateSessionState } from "./actions";

interface Option {
  id: string;
  label: string;
  level?: string | null;
}

interface StudentOption {
  id: string;
  name: string;
  classId: string;
}

type Mode = "LOW" | "MIDDLE" | "HIGH" | "UMUM";

const MODE_INFO: Record<Mode, { label: string; hint: string }> = {
  LOW: {
    label: "Level Low",
    hint: "Screening awal karakter: membaca fabel + soal uraian, lalu menyimak berita + soal dibacakan audio, ditutup gambar bercerita.",
  },
  MIDDLE: {
    label: "Level Middle",
    hint: "Menyimak berita (soal dibacakan berulang) + gambar bercerita.",
  },
  HIGH: {
    label: "Level High",
    hint: "Menyimak teks eksplanasi + gambar bercerita.",
  },
  UMUM: {
    label: "Literasi umum",
    hint: "Sesi baca-simak-tulis lama dengan kuis pilihan ganda.",
  },
};

const initialState: CreateSessionState = {};

export function CreateSessionForm({
  classes,
  texts,
  audios,
  storyPrompts,
  templates,
  students,
}: {
  classes: Option[];
  texts: Option[];
  audios: Option[];
  storyPrompts: Option[];
  templates: Option[];
  students: StudentOption[];
}) {
  const [state, formAction, pending] = useActionState(createSession, initialState);
  const [mode, setMode] = useState<Mode>("LOW");
  const [classIds, setClassIds] = useState<string[]>(classes[0] ? [classes[0].id] : []);
  const [pilihSiswa, setPilihSiswa] = useState(false);

  const needsText = mode === "LOW" || mode === "UMUM";
  const needsAudio = mode === "LOW" || mode === "MIDDLE" || mode === "HIGH" || mode === "UMUM";
  const needsStory = mode !== "UMUM";

  const filteredTexts = useMemo(
    () => (mode === "UMUM" ? texts.filter((t) => !t.level) : texts.filter((t) => t.level === mode)),
    [texts, mode]
  );
  const filteredAudios = useMemo(
    () => (mode === "UMUM" ? audios.filter((a) => !a.level) : audios.filter((a) => a.level === mode)),
    [audios, mode]
  );
  const filteredStories = useMemo(() => storyPrompts.filter((s) => s.level === mode), [storyPrompts, mode]);
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
        <label>Jenis sesi</label>
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button key={m} type="button" className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {MODE_INFO[m].label}
            </button>
          ))}
        </div>
        <p className="hint">{MODE_INFO[mode].hint}</p>
        <input type="hidden" name="mode" value={mode} />
      </div>

      <div className="field">
        <label htmlFor="label">Nama sesi</label>
        <input id="label" name="label" placeholder={mode === "UMUM" ? "Sesi 13 · Literasi VII-C" : `Screening Gestalt · ${MODE_INFO[mode].label}`} required />
      </div>

      <div className="field">
        <label>Kelas (bisa pilih lebih dari satu — sesi yang sama dibuat untuk tiap kelas)</label>
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
            <input
              type="checkbox"
              checked={pilihSiswa}
              onChange={(e) => setPilihSiswa(e.target.checked)}
            />
            Hanya untuk siswa tertentu (screening individual)
          </label>
          {pilihSiswa && (
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--garis)", borderRadius: 2, padding: "8px 12px", marginTop: 8 }}>
            {classStudents.map((s) => (
              <label key={s.id} className="opt" style={{ marginBottom: 4 }}>
                <input type="checkbox" name="studentIds" value={s.id} />
                {s.name}
              </label>
            ))}
            {classStudents.length === 0 && <p className="hint">Tidak ada siswa di kelas ini.</p>}
          </div>
        )}
          {!pilihSiswa && <p className="hint">Tanpa dicentang, sesi berlaku untuk seluruh siswa kelas.</p>}
        </div>
      )}

      {needsText && (
        <div className="field">
          <label htmlFor="readingTextId">Teks bacaan</label>
          <select id="readingTextId" name="readingTextId" required>
            {filteredTexts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {filteredTexts.length === 0 && <p className="hint">Belum ada teks untuk level ini di bank materi.</p>}
        </div>
      )}

      {needsAudio && (
        <div className="field">
          <label htmlFor="audioMaterialId">Audio menyimak</label>
          <select id="audioMaterialId" name="audioMaterialId" required>
            {filteredAudios.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <p className="hint">Hanya audio yang sudah lolos uji dengar yang bisa dipakai (AUD-2).</p>
        </div>
      )}

      {needsStory && (
        <div className="field">
          <label htmlFor="storyPromptId">Gambar bercerita</label>
          <select id="storyPromptId" name="storyPromptId" required>
            {filteredStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {filteredStories.length === 0 && <p className="hint">Belum ada gambar bercerita untuk level ini.</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="worksheetTemplateId">Template lembar kerja</label>
        <select id="worksheetTemplateId" name="worksheetTemplateId" required>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

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
            ? `Buat ${classIds.length} sesi untuk tiap kelas`
            : "Buat sesi & lanjut cetak lembar kerja"}
      </button>
    </form>
  );
}
