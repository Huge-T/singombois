"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseKokurikulerQuestionsCsv } from "@/lib/kokurikulerCsv";
import { deleteUploadedFile } from "@/lib/storage";
import { withRetry } from "@/lib/dbRetry";
import { resetKokurikulerDimensionCore, resetKokurikulerObjectiveCore } from "@/lib/kokurikulerAccess";
import { parseWibDateTimeLocal } from "@/lib/wibTime";

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

export interface ScheduleState {
  error?: string;
  ok?: string;
}

/**
 * Ubah jadwal buka/tutup kuis yang sudah dibuat, supaya siswa yang belum
 * selesai bisa diberi waktu tambahan tanpa membuat kuis baru. `reopen` sekaligus
 * membuka kembali kuis yang berstatus CLOSED (butuh waktu tutup di masa depan).
 */
export async function updateKokurikulerQuizSchedule(
  quizId: string,
  opensAtRaw: string,
  closesAtRaw: string,
  reopen: boolean
): Promise<ScheduleState> {
  const { quiz } = await requireQuizOwner(quizId);

  if (!opensAtRaw || !closesAtRaw) return { error: "Isi tanggal & jam buka dan tutup." };
  const opensAt = parseWibDateTimeLocal(opensAtRaw);
  const closesAt = parseWibDateTimeLocal(closesAtRaw);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return { error: "Format tanggal atau jam tidak valid." };
  }
  if (closesAt <= opensAt) return { error: "Waktu tutup harus setelah waktu buka." };

  const willBeOpen = reopen || quiz.status === "OPEN";
  if (willBeOpen && closesAt <= new Date()) {
    return { error: "Waktu tutup sudah lewat. Pilih waktu tutup di masa depan agar siswa bisa mengerjakan." };
  }

  const questionCount = reopen ? await prisma.kokurikulerQuestion.count({ where: { quizId } }) : 1;
  if (reopen && questionCount === 0) return { error: "Tambahkan soal dulu sebelum membuka kuis." };

  await prisma.kokurikulerQuiz.update({
    where: { id: quizId },
    data: { opensAt, closesAt, ...(reopen ? { status: "OPEN" as const } : {}) },
  });

  revalidatePath(`/guru/kokurikuler/${quizId}`);
  revalidatePath("/guru/kokurikuler");
  revalidatePath("/siswa/kokurikuler");
  revalidatePath(`/siswa/kokurikuler/${quizId}`);
  return { ok: reopen ? "Jadwal disimpan dan kuis dibuka kembali untuk siswa." : "Jadwal disimpan." };
}

export async function resetKokurikulerDimension(quizId: string, attemptId: string, dimension: string) {
  await requireQuizOwner(quizId);

  const attempt = await prisma.kokurikulerAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.quizId !== quizId) throw new Error("Attempt tidak ditemukan");

  await resetKokurikulerDimensionCore(attemptId, dimension);

  revalidatePath(`/guru/kokurikuler/${quizId}/hasil/${attemptId}`);
  revalidatePath(`/guru/kokurikuler/${quizId}/hasil`);
  revalidatePath(`/koordinator/kokurikuler/${quizId}/hasil/${attemptId}`);
  revalidatePath(`/bk/kokurikuler/${attemptId}`);
  revalidatePath(`/siswa/kokurikuler/${quizId}`);
}

export async function resetKokurikulerAttempt(quizId: string, attemptId: string) {
  await requireQuizOwner(quizId);

  const attempt = await prisma.kokurikulerAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.quizId !== quizId) throw new Error("Attempt tidak ditemukan");

  await resetKokurikulerObjectiveCore(attemptId);

  revalidatePath(`/guru/kokurikuler/${quizId}/hasil/${attemptId}`);
  revalidatePath(`/guru/kokurikuler/${quizId}/hasil`);
  revalidatePath(`/koordinator/kokurikuler/${quizId}/hasil/${attemptId}`);
  revalidatePath(`/bk/kokurikuler/${attemptId}`);
  revalidatePath(`/siswa/kokurikuler/${quizId}`);
  revalidatePath("/siswa/kokurikuler");
}

export async function deleteKokurikulerQuiz(quizId: string) {
  await requireQuizOwner(quizId);

  const artifacts = await prisma.kokurikulerArtifact.findMany({
    where: { answer: { attempt: { quizId } } },
    select: { originalPath: true },
  });
  for (const artifact of artifacts) {
    await deleteUploadedFile(artifact.originalPath);
  }

  await withRetry(() =>
    prisma.$transaction([
      prisma.kokurikulerFeatureSet.deleteMany({ where: { artifact: { answer: { attempt: { quizId } } } } }),
      prisma.kokurikulerArtifact.deleteMany({ where: { answer: { attempt: { quizId } } } }),
      prisma.kokurikulerAnswer.deleteMany({ where: { attempt: { quizId } } }),
      prisma.kokurikulerReading.deleteMany({ where: { attempt: { quizId } } }),
      prisma.kokurikulerAttempt.deleteMany({ where: { quizId } }),
      prisma.kokurikulerQuizStudent.deleteMany({ where: { quizId } }),
      prisma.kokurikulerQuestion.deleteMany({ where: { quizId } }),
      prisma.kokurikulerQuiz.delete({ where: { id: quizId } }),
    ])
  );

  revalidatePath("/guru/kokurikuler");
}
