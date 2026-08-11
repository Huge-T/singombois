"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canWriteKokurikulerReading,
  upsertKokurikulerReading,
  type KokurikulerIndicationItem,
} from "@/lib/kokurikulerAccess";

export async function saveKokurikulerReadingAsBk(
  attemptId: string,
  data: { indications: KokurikulerIndicationItem[]; narrative: string; notes: string },
  publish: boolean
) {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    throw new Error("Tidak diizinkan");
  }

  const attempt = await prisma.kokurikulerAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  });
  if (!attempt) throw new Error("Attempt tidak ditemukan");

  const viewer = { id: session.user.id, role, schoolId: session.user.schoolId };
  if (!canWriteKokurikulerReading(viewer, attempt.quiz)) throw new Error("Tidak diizinkan");

  await upsertKokurikulerReading(attemptId, session.user.id, data, publish);

  revalidatePath("/bk/kokurikuler");
  revalidatePath(`/bk/kokurikuler/${attemptId}`);
  revalidatePath(`/guru/kokurikuler/${attempt.quizId}/hasil/${attemptId}`);
  revalidatePath(`/guru/kokurikuler/${attempt.quizId}/hasil`);
  revalidatePath(`/koordinator/kokurikuler/${attempt.quizId}/hasil/${attemptId}`);
}
