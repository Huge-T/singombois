import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadQuizForViewer, canGradeEssay, canWriteKokurikulerReading } from "@/lib/kokurikulerAccess";
import { AttemptDetail } from "@/components/kokurikuler/AttemptDetail";
import { KokurikulerReadingForm, type IndicationItem } from "@/components/kokurikuler/KokurikulerReadingForm";
import { EssayGradeForm } from "./EssayGradeForm";
import { ResetDimensionButton } from "./ResetDimensionButton";
import { ResetAttemptButton } from "./ResetAttemptButton";
import { saveKokurikulerReadingAsGuru } from "./actions";

export default async function GuruKokurikulerAttemptPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const { quizId, attemptId } = await params;
  const session = await auth();
  const viewer = session!.user;
  const quiz = await loadQuizForViewer(quizId, viewer);
  if (!quiz) notFound();

  const attempt = quiz.attempts.find((a) => a.id === attemptId);
  if (!attempt) notFound();

  const hasEssayQuestions = quiz.questions.some((q) => q.type === "URAIAN");
  const canGrade = canGradeEssay(viewer, quiz);
  const canWriteReading = canWriteKokurikulerReading(viewer, quiz);
  const now = new Date();
  const quizOpenNow = quiz.status === "OPEN" && now >= quiz.opensAt && now <= quiz.closesAt;
  const essayIds = new Set(quiz.questions.filter((q) => q.type === "URAIAN").map((q) => q.id));
  const hasObjective = attempt.answers.some((a) => !essayIds.has(a.questionId));
  const initialIndications: IndicationItem[] = attempt.reading ? JSON.parse(attempt.reading.indicationsJson) : [];

  return (
    <div>
      <p className="crumb">GURU · {quiz.label}</p>
      <h2 className="h2">Hasil {attempt.student.name}</h2>

      {canGrade && hasObjective && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="tbl-k">BUKA ULANG KUIS</p>
          <p className="hint" style={{ marginBottom: 8 }}>
            Untuk siswa yang hasilnya kosong atau ingin diberi kesempatan mengulang dari awal.
          </p>
          <ResetAttemptButton quizId={quiz.id} attemptId={attempt.id} />
          {!quizOpenNow && (
            <p className="hint" style={{ marginTop: 8 }}>
              Kuis ini sedang tidak dibuka untuk siswa (ditutup atau di luar waktu pengerjaan). Setelah mengulang,
              ubah jadwalnya dulu di halaman <a href={`/guru/kokurikuler/${quiz.id}`}>Kelola soal</a> supaya siswa
              bisa mengerjakan.
            </p>
          )}
        </div>
      )}

      <AttemptDetail
        questions={quiz.questions}
        attempt={attempt}
        showDraftReading={canWriteReading}
        tema={quiz.tema}
        renderDimensionRetry={
          canGrade
            ? (dimension) => <ResetDimensionButton quizId={quiz.id} attemptId={attempt.id} dimension={dimension} />
            : undefined
        }
      />

      {canGrade && hasEssayQuestions && (
        <div style={{ marginTop: 20 }}>
          <p className="tbl-k">NILAI ESAI</p>
          <EssayGradeForm attemptId={attempt.id} initialScore={attempt.essayScore} />
        </div>
      )}

      {canWriteReading && (
        <div style={{ marginTop: 20 }}>
          <p className="tbl-k">TULIS ANALISIS KEPRIBADIAN</p>
          <KokurikulerReadingForm
            attemptId={attempt.id}
            initialIndications={initialIndications}
            initialNarrative={attempt.reading?.narrative ?? ""}
            initialNotes={attempt.reading?.notes ?? ""}
            initialStatus={attempt.reading?.status ?? null}
            saveAction={saveKokurikulerReadingAsGuru}
            afterPublishHref={`/guru/kokurikuler/${quiz.id}/hasil`}
          />
        </div>
      )}
    </div>
  );
}
