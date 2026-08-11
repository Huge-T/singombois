import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { ResultsTable } from "@/components/kokurikuler/ResultsTable";

export default async function GuruKokurikulerHasilPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const quiz = await loadQuizForViewer(quizId, session!.user);
  if (!quiz) notFound();

  const hasEssayQuestions = quiz.questions.some((q) => q.type === "URAIAN");

  return (
    <div>
      <p className="crumb">GURU · {quiz.label}</p>
      <h2 className="h2">Hasil kuis</h2>
      <p className="sub">
        {quiz.class.name} {quiz.tema ? `· Tema ${quiz.tema}` : ""}
      </p>

      <ResultsTable
        attempts={quiz.attempts}
        basePath={`/guru/kokurikuler/${quiz.id}/hasil`}
        hasEssayQuestions={hasEssayQuestions}
      />
    </div>
  );
}
