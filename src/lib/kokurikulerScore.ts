import type { KokurikulerQuestionType } from "@prisma/client";

/**
 * Rumus nilai kokurikuler — versi terbuka dan terdokumentasi (seperti rubrik
 * kerapian/gestalt). Tiap soal berbobot sama, objektif (PG/Benar-Salah) atau
 * uraian: finalScore = ((objectiveCorrect + essayScore/100 * essayTotal) /
 * (objectiveTotal + essayTotal)) * 100. Bila kuis tidak punya soal uraian,
 * skor langsung final saat siswa submit tanpa menunggu guru.
 */
export const KOKURIKULER_SCORE_VERSION = "kokurikuler-nilai-v1.0";

export function gradeObjectiveAnswer(
  question: { type: KokurikulerQuestionType; correctAnswer: string | null },
  answerText: string
): boolean | null {
  if (question.type === "URAIAN") return null;
  if (!question.correctAnswer) return null;
  return answerText.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase();
}

export function computeKokurikulerFinalScore(input: {
  objectiveCorrect: number;
  objectiveTotal: number;
  essayScore: number | null;
  essayTotal: number;
}): number | null {
  const { objectiveCorrect, objectiveTotal, essayScore, essayTotal } = input;
  const totalQuestions = objectiveTotal + essayTotal;
  if (totalQuestions === 0) return null;
  if (essayTotal > 0 && essayScore === null) return null;

  const essayPoints = essayTotal > 0 ? (essayScore! / 100) * essayTotal : 0;
  return Math.round(((objectiveCorrect + essayPoints) / totalQuestions) * 100 * 10) / 10;
}
