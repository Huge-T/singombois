"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseKokurikulerQuestionsCsv } from "@/lib/kokurikulerCsv";

async function requireQuizOwner(quizId: string) {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    throw new Error("Tidak diizinkan");
  }
  const quiz = await prisma.kokurikulerQuiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new Error("Kuis tidak ditemukan");
  const isOwner = quiz.createdById === session.user.id || role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isOwner) throw new Error("Tidak diizinkan");
  return { quiz, user: session.user };
}

export interface UploadQuestionsState {
  error?: string;
  createdCount?: number;
  rowErrors?: { rowNumber: number; message: string }[];
}

export async function uploadKokurikulerQuestionsCsv(
  quizId: string,
  _prev: UploadQuestionsState,
  formData: FormData
): Promise<UploadQuestionsState> {
  const { quiz } = await requireQuizOwner(quizId);

  if (quiz.status !== "DRAFT") {
    return { error: "Kuis sudah dibuka; tutup dulu untuk mengubah soal lewat CSV." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih berkas CSV template soal kokurikuler." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Berkas CSV lebih dari 2MB." };
  }

  const text = await file.text();
  const { rows, errors } = parseKokurikulerQuestionsCsv(text);
  if (errors.length > 0) {
    return { rowErrors: errors };
  }
  if (rows.length === 0) {
    return { error: "Berkas CSV tidak berisi baris soal." };
  }

  const maxOrder = await prisma.kokurikulerQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  await prisma.$transaction(
    rows.map((row) =>
      prisma.kokurikulerQuestion.create({
        data: {
          quizId,
          order: nextOrder++,
          type: row.type,
          text: row.text,
          optionsJson: row.options ? JSON.stringify(row.options) : null,
          correctAnswer: row.correctAnswer,
          personalityDimension: row.personalityDimension,
        },
      })
    )
  );

  revalidatePath(`/guru/kokurikuler/${quizId}`);
  return { createdCount: rows.length };
}

export async function openKokurikulerQuiz(quizId: string) {
  await requireQuizOwner(quizId);
  const questionCount = await prisma.kokurikulerQuestion.count({ where: { quizId } });
  if (questionCount === 0) throw new Error("Tambahkan soal dulu sebelum membuka kuis.");
  await prisma.kokurikulerQuiz.update({ where: { id: quizId }, data: { status: "OPEN" } });
  revalidatePath(`/guru/kokurikuler/${quizId}`);
  revalidatePath("/guru/kokurikuler");
  revalidatePath("/siswa/kokurikuler");
}

export async function closeKokurikulerQuiz(quizId: string) {
  await requireQuizOwner(quizId);
  await prisma.kokurikulerQuiz.update({ where: { id: quizId }, data: { status: "CLOSED" } });
  revalidatePath(`/guru/kokurikuler/${quizId}`);
  revalidatePath("/guru/kokurikuler");
  revalidatePath("/siswa/kokurikuler");
}
