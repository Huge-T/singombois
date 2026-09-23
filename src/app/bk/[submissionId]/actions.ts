"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/optimisticLock";

function assertBk(role: string | undefined) {
  if (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

export interface StrengthItem {
  title: string;
  detail: string;
}

export async function saveReading(
  submissionId: string,
  data: { strengths: StrengthItem[]; learningSuggestions: string; notes: string },
  publish: boolean,
  expectedUpdatedAt: string | null
) {
  const session = await auth();
  assertBk(session?.user.role);
  const readerId = session!.user.id;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { student: true },
  });
  if (!submission || submission.student.schoolId !== session!.user.schoolId) {
    throw new Error("Submission tidak ditemukan");
  }

  const strengths = data.strengths.filter((s) => s.title.trim() || s.detail.trim());
  const payload = {
    readerId,
    strengthsJson: JSON.stringify(strengths),
    learningSuggestions: data.learningSuggestions,
    notes: data.notes || null,
    status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    publishedAt: publish ? new Date() : undefined,
  };

  // Optimistic locking: cegah dua Guru BK saling menimpa draf tanpa sadar.
  let readingId: string;
  let newUpdatedAt: Date;
  if (expectedUpdatedAt === null) {
    try {
      const created = await prisma.characterReading.create({
        data: { submissionId, ...payload, publishedAt: publish ? new Date() : null },
      });
      readingId = created.id;
      newUpdatedAt = created.updatedAt;
    } catch {
      throw new ConflictError();
    }
  } else {
    const result = await prisma.characterReading.updateMany({
      where: { submissionId, updatedAt: new Date(expectedUpdatedAt) },
      data: payload,
    });
    if (result.count === 0) throw new ConflictError();
    const updated = await prisma.characterReading.findUniqueOrThrow({ where: { submissionId } });
    readingId = updated.id;
    newUpdatedAt = updated.updatedAt;
  }

  await prisma.auditLog.create({
    data: {
      userId: readerId,
      actorType: "staff",
      action: publish ? "PUBLISH_CHARACTER_READING" : "DRAFT_CHARACTER_READING",
      entity: "CharacterReading",
      entityId: readingId,
    },
  });

  revalidatePath(`/bk/${submissionId}`);
  revalidatePath("/bk");
  if (publish) {
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (submission) revalidatePath(`/siswa/sesi/${submission.sessionId}/hasil`);
  }

  return { updatedAt: newUpdatedAt.toISOString() };
}
