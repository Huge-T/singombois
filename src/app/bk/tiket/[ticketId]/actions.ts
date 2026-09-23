"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function assertBk(role: string | undefined) {
  if (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

export async function replyTicket(ticketId: string, body: string) {
  const session = await auth();
  assertBk(session?.user.role);
  if (!body.trim()) return;

  const ticket = await prisma.consultTicket.findUnique({ where: { id: ticketId }, include: { student: true } });
  if (!ticket || ticket.student.schoolId !== session!.user.schoolId) throw new Error("Tiket tidak ditemukan");

  await prisma.$transaction([
    prisma.consultMessage.create({
      data: { ticketId, senderRole: "STAFF", senderId: session!.user.id, body: body.trim() },
    }),
    prisma.consultTicket.update({ where: { id: ticketId }, data: { status: "ANSWERED" } }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "REPLY_CONSULT_TICKET",
      entity: "ConsultTicket",
      entityId: ticketId,
    },
  });

  revalidatePath(`/bk/tiket/${ticketId}`);
  revalidatePath("/bk/tiket");
  revalidatePath(`/siswa/konsultasi/${ticketId}`);
}

export async function closeTicket(ticketId: string) {
  const session = await auth();
  assertBk(session?.user.role);

  const ticket = await prisma.consultTicket.findUnique({ where: { id: ticketId }, include: { student: true } });
  if (!ticket || ticket.student.schoolId !== session!.user.schoolId) throw new Error("Tiket tidak ditemukan");

  await prisma.consultTicket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });

  revalidatePath(`/bk/tiket/${ticketId}`);
  revalidatePath("/bk/tiket");
  revalidatePath(`/siswa/konsultasi/${ticketId}`);
}
