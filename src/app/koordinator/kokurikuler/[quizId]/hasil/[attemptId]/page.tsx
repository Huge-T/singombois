import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { AttemptDetail } from "@/components/kokurikuler/AttemptDetail";

export default async function KoordinatorKokurikulerAttemptPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const { quizId, attemptId } = await params;
  const session = await auth();
  const quiz = await loadQuizForViewer(quizId, session!.user);
  if (!quiz) notFound();

  const attempt = quiz.attempts.find((a) => a.id === attemptId);
  if (!attempt) notFound();

  return (
    <div>
      <p className="crumb">KOORDINATOR · {quiz.label}</p>
      <h2 className="h2">Hasil {attempt.student.name}</h2>

      <AttemptDetail questions={quiz.questions} attempt={attempt} showDraftReading={false} />
    </div>
  );
}
