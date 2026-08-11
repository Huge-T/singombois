import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { ResultsTable } from "@/components/kokurikuler/ResultsTable";

export default async function KoordinatorKokurikulerHasilPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const quiz = await loadQuizForViewer(quizId, session!.user);
  if (!quiz) notFound();

  const hasEssayQuestions = quiz.questions.some((q) => q.type === "URAIAN");

  return (
    <div>
      <p className="crumb">KOORDINATOR · {quiz.label}</p>
      <h2 className="h2">Hasil kuis (read-only)</h2>
      <p className="sub">
        {quiz.class.name} {quiz.tema ? `· Tema ${quiz.tema}` : ""}
      </p>

      <ResultsTable
        attempts={quiz.attempts}
        basePath={`/koordinator/kokurikuler/${quiz.id}/hasil`}
        hasEssayQuestions={hasEssayQuestions}
      />
    </div>
  );
}
