"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canGradeEssay,
  canWriteKokurikulerReading,
  upsertKokurikulerReading,
  type KokurikulerIndicationItem,
} from "@/lib/kokurikulerAccess";
import { computeKokurikulerFinalScore } from "@/lib/kokurikulerScore";

async function loadAttemptWithQuiz(attemptId: string) {
  const attempt = await prisma.kokurikulerAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: true } } },
  });
  if (!attempt) throw new Error("Attempt tidak ditemukan");
  return attempt;
}

function revalidateAttemptPaths(quizId: string, attemptId: string) {
  revalidatePath(`/guru/kokurikuler/${quizId}/hasil/${attemptId}`);
  revalidatePath(`/guru/kokurikuler/${quizId}/hasil`);
  revalidatePath("/bk/kokurikuler");
  revalidatePath(`/bk/kokurikuler/${attemptId}`);
  revalidatePath(`/koordinator/kokurikuler/${quizId}/hasil/${attemptId}`);
}

export interface SaveEssayState {
  error?: string;
  saved?: boolean;
}

export async function saveEssayScore(
  attemptId: string,
  _prev: SaveEssayState,
  formData: FormData
): Promise<SaveEssayState> {
  const session = await auth();
  if (!session?.user) return { error: "Tidak diizinkan" };

  const attempt = await loadAttemptWithQuiz(attemptId);
  const viewer = { id: session.user.id, role: session.user.role, schoolId: session.user.schoolId };
  if (!canGradeEssay(viewer, attempt.quiz)) return { error: "Tidak diizinkan" };

  const essayScore = Number(formData.get("essayScore"));
  if (Number.isNaN(essayScore) || essayScore < 0 || essayScore > 100) {
    return { error: "Nilai esai harus angka 0-100" };
  }

  const essayTotal = attempt.quiz.questions.filter((q) => q.type === "URAIAN").length;
  const finalScore = computeKokurikulerFinalScore({
    objectiveCorrect: attempt.autoCorrect ?? 0,
    objectiveTotal: attempt.autoTotal ?? 0,
    essayScore,
    essayTotal,
  });

  await prisma.kokurikulerAttempt.update({
    where: { id: attemptId },
    data: { essayScore, essayGradedById: session.user.id, essayGradedAt: new Date(), finalScore },
  });

  revalidateAttemptPaths(attempt.quizId, attemptId);
  return { saved: true };
}

export async function saveKokurikulerReadingAsGuru(
  attemptId: string,
  data: { indications: KokurikulerIndicationItem[]; narrative: string; notes: string },
  publish: boolean
) {
  const session = await auth();
  if (!session?.user) throw new Error("Tidak diizinkan");

  const attempt = await loadAttemptWithQuiz(attemptId);
  const viewer = { id: session.user.id, role: session.user.role, schoolId: session.user.schoolId };
  if (!canWriteKokurikulerReading(viewer, attempt.quiz)) throw new Error("Tidak diizinkan");

  await upsertKokurikulerReading(attemptId, session.user.id, data, publish);
  revalidateAttemptPaths(attempt.quizId, attemptId);
}
