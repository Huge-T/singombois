import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { AttemptDetail } from "@/components/kokurikuler/AttemptDetail";
import { KokurikulerReadingForm, type IndicationItem } from "@/components/kokurikuler/KokurikulerReadingForm";
import { saveKokurikulerReadingAsBk } from "./actions";

export default async function BkKokurikulerAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const viewer = session!.user;

  const bare = await prisma.kokurikulerAttempt.findUnique({ where: { id: attemptId }, select: { quizId: true } });
  if (!bare) notFound();

  const quiz = await loadQuizForViewer(bare.quizId, viewer);
  if (!quiz) notFound();
  const attempt = quiz.attempts.find((a) => a.id === attemptId);
  if (!attempt) notFound();

  const initialIndications: IndicationItem[] = attempt.reading ? JSON.parse(attempt.reading.indicationsJson) : [];

  return (
    <div>
      <p className="crumb">GURU BK · {quiz.label}</p>
      <h2 className="h2">Hasil {attempt.student.name}</h2>
      <p className="sub">
        Bahan analisis: pola jawaban PG/Benar-Salah bertag dimensi + kutipan jawaban uraian, bukan skor otomatis.
      </p>

      <AttemptDetail questions={quiz.questions} attempt={attempt} showDraftReading />

      <div style={{ marginTop: 20 }}>
        <p className="tbl-k">TULIS ANALISIS KEPRIBADIAN</p>
        <KokurikulerReadingForm
          attemptId={attempt.id}
          initialIndications={initialIndications}
          initialNarrative={attempt.reading?.narrative ?? ""}
          initialNotes={attempt.reading?.notes ?? ""}
          initialStatus={attempt.reading?.status ?? null}
          saveAction={saveKokurikulerReadingAsBk}
          afterPublishHref="/bk/kokurikuler"
        />
      </div>
    </div>
  );
}
