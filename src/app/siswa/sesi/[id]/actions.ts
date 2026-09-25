"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

async function requireOwnSubmission(submissionId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Tidak diizinkan");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { session: { include: { readingText: true, audioMaterial: true } } },
  });
  if (!submission || submission.studentId !== session.user.id) throw new Error("Tidak diizinkan");

  const now = new Date();
  if (now < submission.session.opensAt || now > submission.session.closesAt) {
    throw new Error("Sesi sudah tidak bisa dikerjakan (di luar jadwal buka/tutup).");
  }

  return submission;
}

function gradeQuiz(quizJson: string | null, answers: number[]): { correct: number; total: number } {
  if (!quizJson) return { correct: 0, total: 0 };
  const quiz: QuizQuestion[] = JSON.parse(quizJson);
  let correct = 0;
  quiz.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correct++;
  });
  return { correct, total: quiz.length };
}

export async function recordReading(submissionId: string, readSeconds: number, answers: number[]) {
  const submission = await requireOwnSubmission(submissionId);
  // Sesi Gestalt: jawaban ditulis tangan di kertas, tidak ada kuis di layar —
  // yang direkam hanya telemetri waktu baca (total 0 berarti "dinilai dari kertas").
  const { correct, total } = gradeQuiz(submission.session.readingText?.quizJson ?? null, answers);
  await prisma.submission.update({
    where: { id: submissionId },
    data: { readSeconds, readingCorrect: correct, readingTotal: total },
  });
  return { correct, total };
}

// Harus sama dengan maxPlays yang dikirim ke SessionRunner (page.tsx) — nilai
// dari klien tidak dipercaya mentah-mentah, cuma dipakai sebagai telemetri
// yang dibatasi ulang di sini.
const LISTENING_MAX_PLAYS = 2;

export async function recordListening(submissionId: string, audioPlays: number, answers: number[]) {
  const submission = await requireOwnSubmission(submissionId);
  const { correct, total } = gradeQuiz(submission.session.audioMaterial?.quizJson ?? null, answers);
  const clampedAudioPlays = Math.max(0, Math.min(audioPlays, LISTENING_MAX_PLAYS));
  await prisma.submission.update({
    where: { id: submissionId },
    data: { audioPlays: clampedAudioPlays, listeningCorrect: correct, listeningTotal: total },
  });
  return { correct, total };
}
