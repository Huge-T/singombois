import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadQuizForViewer, canGradeEssay, canWriteKokurikulerReading } from "@/lib/kokurikulerAccess";
import { AttemptDetail } from "@/components/kokurikuler/AttemptDetail";
import { KokurikulerReadingForm, type IndicationItem } from "@/components/kokurikuler/KokurikulerReadingForm";
import { EssayGradeForm } from "./EssayGradeForm";
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
  const initialIndications: IndicationItem[] = attempt.reading ? JSON.parse(attempt.reading.indicationsJson) : [];

  return (
    <div>
      <p className="crumb">GURU · {quiz.label}</p>
      <h2 className="h2">Hasil {attempt.student.name}</h2>

      <AttemptDetail questions={quiz.questions} attempt={attempt} showDraftReading={canWriteReading} />

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
