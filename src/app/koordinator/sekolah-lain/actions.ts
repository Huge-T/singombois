"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function assertCoordinator(role: string | undefined) {
  if (role !== "COORDINATOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

export async function setContactLeadHandled(leadId: string, handled: boolean) {
  const session = await auth();
  assertCoordinator(session?.user.role);

  const lead = await prisma.contactLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Minat sekolah tidak ditemukan");

  await prisma.contactLead.update({ where: { id: leadId }, data: { handled } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: handled ? "HANDLE_CONTACT_LEAD" : "UNHANDLE_CONTACT_LEAD",
      entity: "ContactLead",
      entityId: leadId,
    },
  });

  revalidatePath("/koordinator/sekolah-lain");
}
