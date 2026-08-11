"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  publish: boolean
) {
  const session = await auth();
  assertBk(session?.user.role);
  const readerId = session!.user.id;

  const strengths = data.strengths.filter((s) => s.title.trim() || s.detail.trim());

  const reading = await prisma.characterReading.upsert({
    where: { submissionId },
    update: {
      readerId,
      strengthsJson: JSON.stringify(strengths),
      learningSuggestions: data.learningSuggestions,
      notes: data.notes || null,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : undefined,
    },
    create: {
      submissionId,
      readerId,
      strengthsJson: JSON.stringify(strengths),
      learningSuggestions: data.learningSuggestions,
      notes: data.notes || null,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: readerId,
      actorType: "staff",
      action: publish ? "PUBLISH_CHARACTER_READING" : "DRAFT_CHARACTER_READING",
      entity: "CharacterReading",
      entityId: reading.id,
    },
  });

  revalidatePath(`/bk/${submissionId}`);
  revalidatePath("/bk");
  if (publish) {
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (submission) revalidatePath(`/siswa/sesi/${submission.sessionId}/hasil`);
  }
}
