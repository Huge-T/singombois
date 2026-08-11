"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeObjectiveAnswer, computeKokurikulerFinalScore } from "@/lib/kokurikulerScore";

export interface SubmitKokurikulerState {
  error?: string;
  ok?: boolean;
}

export async function submitKokurikulerAttempt(
  quizId: string,
  answers: { questionId: string; answerText: string }[]
): Promise<SubmitKokurikulerState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") return { error: "Tidak diizinkan" };

  const student = await prisma.student.findUnique({ where: { id: session.user.id } });
  if (!student) return { error: "Tidak ditemukan" };

  const quiz = await prisma.kokurikulerQuiz.findUnique({
    where: { id: quizId },
    include: { questions: true, targetedStudents: true },
  });
  if (!quiz || quiz.classId !== student.classId) return { error: "Kuis tidak ditemukan" };
  if (quiz.status !== "OPEN") return { error: "Kuis tidak sedang dibuka" };

  const now = new Date();
  if (now < quiz.opensAt || now > quiz.closesAt) return { error: "Di luar waktu pengerjaan" };
  if (quiz.targetedStudents.length > 0 && !quiz.targetedStudents.some((t) => t.studentId === student.id)) {
    return { error: "Tidak diizinkan" };
  }

  const existing = await prisma.kokurikulerAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
  });
  if (existing?.submittedAt) return { error: "Kuis sudah dikumpulkan sebelumnya" };

  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a.answerText]));

  let autoCorrect = 0;
  let autoTotal = 0;
  let essayTotal = 0;
  const answerRows = quiz.questions.map((q) => {
    const answerText = (answerByQuestionId.get(q.id) ?? "").trim();
    const isCorrect = gradeObjectiveAnswer(q, answerText);
    if (q.type === "URAIAN") {
      essayTotal += 1;
    } else {
      autoTotal += 1;
      if (isCorrect) autoCorrect += 1;
    }
    return { questionId: q.id, answerText, isCorrect };
  });

  const finalScore = computeKokurikulerFinalScore({
    objectiveCorrect: autoCorrect,
    objectiveTotal: autoTotal,
    essayScore: null,
    essayTotal,
  });

  await prisma.$transaction(async (tx) => {
    const attempt = await tx.kokurikulerAttempt.upsert({
      where: { quizId_studentId: { quizId, studentId: student.id } },
      update: { submittedAt: now, autoCorrect, autoTotal, finalScore },
      create: { quizId, studentId: student.id, submittedAt: now, autoCorrect, autoTotal, finalScore },
    });
    await tx.kokurikulerAnswer.deleteMany({ where: { attemptId: attempt.id } });
    await tx.kokurikulerAnswer.createMany({ data: answerRows.map((a) => ({ attemptId: attempt.id, ...a })) });
  });

  revalidatePath("/siswa/kokurikuler");
  return { ok: true };
}
