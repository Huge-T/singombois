import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuizRunner } from "./QuizRunner";

export default async function SiswaKokurikulerQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) redirect("/masuk");

  const quiz = await prisma.kokurikulerQuiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } }, targetedStudents: true },
  });
  if (!quiz || quiz.classId !== student.classId || quiz.status !== "OPEN") notFound();
  if (quiz.targetedStudents.length > 0 && !quiz.targetedStudents.some((t) => t.studentId === student.id)) {
    notFound();
  }

  const now = new Date();
  if (now < quiz.opensAt || now > quiz.closesAt) notFound();

  const existing = await prisma.kokurikulerAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
  });
  if (existing?.submittedAt) redirect("/siswa/kokurikuler");

  return (
    <div>
      <p className="crumb">SISWA</p>
      <h2 className="h2">{quiz.label}</h2>
      <p className="sub">{quiz.tema ? `Tema ${quiz.tema} · ` : ""}Jawab semua soal lalu kumpulkan.</p>

      <QuizRunner
        quizId={quiz.id}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          order: q.order,
          type: q.type,
          text: q.text,
          optionsJson: q.optionsJson,
        }))}
      />
    </div>
  );
}
