"use client";

import Link from "next/link";
import { useActionState } from "react";
import { uploadKokurikulerQuestionsCsv, type UploadQuestionsState } from "./actions";

const initialState: UploadQuestionsState = {};

export function UploadQuestionsForm({ quizId }: { quizId: string }) {
  const action = uploadKokurikulerQuestionsCsv.bind(null, quizId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-card" style={{ maxWidth: 520 }}>
      {state.error && <div className="error-box">{state.error}</div>}
      {state.rowErrors && state.rowErrors.length > 0 && (
        <div className="error-box">
          <p>CSV punya {state.rowErrors.length} baris bermasalah — tidak ada yang tersimpan:</p>
          <ul>
            {state.rowErrors.map((e, i) => (
              <li key={i}>
                Baris {e.rowNumber}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.createdCount !== undefined && (
        <div className="notice-box">{state.createdCount} soal berhasil ditambahkan.</div>
      )}
      <div className="field">
        <label htmlFor="file">Berkas CSV soal + kunci jawaban</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="hint">
          Pakai <Link href="/guru/kokurikuler/template">template CSV</Link> — kolom: tipe_soal, teks_soal, opsi_a..d,
          kunci_jawaban, dimensi_kepribadian (opsional).
        </p>
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Mengunggah..." : "Unggah soal"}
      </button>
    </form>
  );
}
