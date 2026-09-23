"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { deleteStudentArtifacts } from "@/lib/consent";
import { prisma } from "@/lib/prisma";

/**
 * PRIV-2: revoking consent deletes uploaded artifacts and their derived results.
 * The PRD allows a 30-day grace window before deletion; since this app has no
 * background job runner, we delete immediately and log the action instead of
 * silently doing nothing until "later" — an honest implementation beats a
 * promise the codebase can't keep.
 */
export async function revokeConsentAndDeleteArtifacts() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Tidak diizinkan");

  const studentId = session.user.id;

  await deleteStudentArtifacts(studentId);

  await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: { consentStatus: "REVOKED" } }),
    prisma.consent.updateMany({
      where: { studentId },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorType: "student",
        action: "REVOKE_CONSENT_DELETE_ARTIFACTS",
        entity: "Student",
        entityId: studentId,
      },
    }),
  ]);

  revalidatePath("/siswa/data-saya");
}
