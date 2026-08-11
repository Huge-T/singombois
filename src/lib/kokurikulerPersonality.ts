import type { KokurikulerQuestionType } from "@prisma/client";

/**
 * Tally pola jawaban kokurikuler per dimensi kepribadian — versi terbuka dan
 * terdokumentasi, dihitung LIVE saat halaman dibuka (tidak disimpan ke DB),
 * sama seperti interpretGestalt() di src/lib/gestalt.ts. Ini BUKAN diagnosis
 * kepribadian: hanya rangkuman mekanis dari (a) benar/salahnya jawaban PG/
 * Benar-Salah yang guru tandai dengan sebuah dimensi, dan (b) kutipan mentah
 * jawaban uraian dikelompokkan per dimensi. Simpulan naratif kepribadian
 * SELALU ditulis manusia (guru pembuat kuis / Guru BK) lewat KokurikulerReading,
 * bukan dihasilkan fungsi ini.
 */
export const KOKURIKULER_PATTERN_VERSION = "kokurikuler-pola-v1.0";

export const KOKURIKULER_PATTERN_DISCLAIMER =
  "Ini pola jawaban mekanis dari soal pilihan ganda/benar-salah, bukan diagnosis kepribadian. Simpulan akhir ditulis dan divalidasi guru pembuat kuis atau Guru BK.";

export interface DimensionTally {
  dimension: string;
  correct: number;
  total: number;
  pct: number; // 0-100, dibulatkan
}

export interface EssayNote {
  dimension: string | null; // null = tidak ditandai dimensi apa pun
  questionText: string;
  answerText: string;
}

export interface KokurikulerPatternResult {
  dimensionTallies: DimensionTally[];
  essayNotes: EssayNote[];
  disclaimer: string;
}

export interface PatternQuestionInput {
  id: string;
  type: KokurikulerQuestionType;
  text: string;
  personalityDimension: string | null;
}

export interface PatternAnswerInput {
  questionId: string;
  answerText: string;
  isCorrect: boolean | null;
}

export function summarizeKokurikulerPersonalityPattern(
  questions: PatternQuestionInput[],
  answers: PatternAnswerInput[]
): KokurikulerPatternResult {
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));
  const tallyByDimension = new Map<string, { correct: number; total: number }>();
  const essayNotes: EssayNote[] = [];

  for (const question of questions) {
    const answer = answerByQuestionId.get(question.id);
    if (!answer) continue;

    if (question.type === "URAIAN") {
      essayNotes.push({
        dimension: question.personalityDimension,
        questionText: question.text,
        answerText: answer.answerText,
      });
      continue;
    }

    if (!question.personalityDimension || answer.isCorrect === null) continue;
    const entry = tallyByDimension.get(question.personalityDimension) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    tallyByDimension.set(question.personalityDimension, entry);
  }

  const dimensionTallies: DimensionTally[] = Array.from(tallyByDimension.entries()).map(
    ([dimension, { correct, total }]) => ({
      dimension,
      correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    })
  );

  return { dimensionTallies, essayNotes, disclaimer: KOKURIKULER_PATTERN_DISCLAIMER };
}
