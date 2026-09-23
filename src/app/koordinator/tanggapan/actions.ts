"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function assertCoordinator(role: string | undefined) {
  if (role !== "COORDINATOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

export async function setFeedbackApproved(feedbackId: string, approved: boolean) {
  const session = await auth();
  assertCoordinator(session?.user.role);

  const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId }, include: { student: true } });
  if (!feedback || feedback.student.schoolId !== session!.user.schoolId) {
    throw new Error("Tanggapan tidak ditemukan");
  }

  // Persetujuan siswa adalah batas keras: tanpa izin tampil, koordinator
  // tidak bisa menayangkannya, titik.
  if (approved && feedback.displayConsent === "TIDAK") {
    throw new Error("Siswa tidak mengizinkan tanggapannya ditampilkan");
  }

  await prisma.feedback.update({ where: { id: feedbackId }, data: { approved } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: approved ? "APPROVE_FEEDBACK" : "UNAPPROVE_FEEDBACK",
      entity: "Feedback",
      entityId: feedbackId,
    },
  });

  revalidatePath("/koordinator/tanggapan");
  revalidatePath("/");
}
