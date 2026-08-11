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
