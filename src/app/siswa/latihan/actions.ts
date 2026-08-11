"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markExerciseDone(assignmentId: string) {
  const session = await auth();
  const assignment = await prisma.exerciseAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.studentId !== session?.user.id) throw new Error("Tidak diizinkan");

  await prisma.exerciseAssignment.update({
    where: { id: assignmentId },
    data: { completedAt: new Date() },
  });
  revalidatePath("/siswa/latihan");
}
