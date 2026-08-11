"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Cari tiket yang sudah ada untuk submission ini, atau buat baru. */
export async function openTicket(submissionId: string, sessionLabel: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Tidak diizinkan");

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.studentId !== session.user.id) throw new Error("Tidak diizinkan");

  const existing = await prisma.consultTicket.findFirst({
    where: { submissionId, studentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.id;

  const ticket = await prisma.consultTicket.create({
    data: {
      studentId: session.user.id,
      submissionId,
      subject: `Soal hasil sesi ${sessionLabel}`,
    },
  });
  return ticket.id;
}
