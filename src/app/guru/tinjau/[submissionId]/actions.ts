"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveReview(
  submissionId: string,
  scoreId: string,
  decisions: { aspect: string; machineValue: number; teacherValue: number }[],
  writingContent: number | null
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Tidak diizinkan");
  }
  const reviewerId = session.user.id;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { session: true },
  });
  const isOwner =
    submission?.session.createdById === reviewerId ||
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN";
  if (!submission || !isOwner) throw new Error("Submission tidak ditemukan");

  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score || score.submissionId !== submissionId) throw new Error("Skor tidak ditemukan");

  await prisma.$transaction(
    decisions.map((d) =>
      prisma.teacherReview.upsert({
        where: { scoreId_aspect: { scoreId, aspect: d.aspect } },
        update: { teacherValue: d.teacherValue, agree: d.machineValue === d.teacherValue, reviewerId },
        create: {
          scoreId,
          reviewerId,
          aspect: d.aspect,
          machineValue: d.machineValue,
          teacherValue: d.teacherValue,
          agree: d.machineValue === d.teacherValue,
        },
      })
    )
  );

  if (writingContent !== null) {
    await prisma.score.update({ where: { id: scoreId }, data: { writingContent } });
  }

  revalidatePath(`/guru/tinjau/${submissionId}`);
  revalidatePath("/guru/tinjau");
}
