"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function replyAsStudent(ticketId: string, body: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Tidak diizinkan");
  if (!body.trim()) return;

  const ticket = await prisma.consultTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.studentId !== session.user.id) throw new Error("Tidak diizinkan");
  if (ticket.status === "CLOSED") throw new Error("Tiket sudah ditutup");

  await prisma.$transaction([
    prisma.consultMessage.create({
      data: { ticketId, senderRole: "STUDENT", senderId: session.user.id, body: body.trim() },
    }),
    prisma.consultTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } }),
  ]);

  revalidatePath(`/siswa/konsultasi/${ticketId}`);
  revalidatePath("/bk/tiket");
}
