import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { UploadQuestionsForm } from "./UploadQuestionsForm";
import { openKokurikulerQuiz, closeKokurikulerQuiz } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan ganda",
  BENAR_SALAH: "Benar-salah",
  URAIAN: "Uraian",
};

export default async function KelolaKokurikulerPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const quiz = await loadQuizForViewer(quizId, session!.user);
  if (!quiz) notFound();

  const isOwner = quiz.createdById === session!.user.id;

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">{quiz.label}</h2>
      <p className="sub">
        {quiz.class.name} {quiz.tema ? `· Tema ${quiz.tema}` : ""} · <span className="pill">{quiz.status}</span>
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="tbl-k">SOAL ({quiz.questions.length})</p>
        {quiz.questions.length === 0 && <p className="hint">Belum ada soal — unggah lewat CSV di bawah.</p>}
        {quiz.questions.map((q) => (
          <div className="rev-item" key={q.id}>
            <p>
              {q.order}. {q.text}
            </p>
            <p className="hint">
              {TYPE_LABEL[q.type]}
              {q.correctAnswer ? ` · kunci: ${q.correctAnswer}` : ""}
              {q.personalityDimension ? ` · dimensi: ${q.personalityDimension}` : ""}
            </p>
          </div>
        ))}
      </div>

      {isOwner && quiz.status === "DRAFT" && <UploadQuestionsForm quizId={quiz.id} />}

      {isOwner && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {quiz.status === "DRAFT" && (
            <form action={openKokurikulerQuiz.bind(null, quiz.id)}>
              <button className="btn" disabled={quiz.questions.length === 0}>
                Buka untuk siswa
              </button>
            </form>
          )}
          {quiz.status === "OPEN" && (
            <form action={closeKokurikulerQuiz.bind(null, quiz.id)}>
              <button className="btn btn-ghost">Tutup kuis</button>
            </form>
          )}
        </div>
      )}

      <p style={{ marginTop: 20 }}>
        <Link className="btn btn-ghost btn-sm" href={`/guru/kokurikuler/${quiz.id}/hasil`}>
          Lihat hasil siswa
        </Link>
      </p>
    </div>
  );
}
