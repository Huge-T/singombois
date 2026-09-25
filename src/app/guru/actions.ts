"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";
import { withRetry } from "@/lib/dbRetry";

export async function deleteSession(sessionId: string) {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    throw new Error("Tidak diizinkan");
  }

  const target = await withRetry(() => prisma.session.findUnique({ where: { id: sessionId } }));
  if (!target) throw new Error("Sesi tidak ditemukan");
  const isOwner = target.createdById === session.user.id || role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isOwner) throw new Error("Tidak diizinkan");

  const submissions = await prisma.submission.findMany({ where: { sessionId }, select: { id: true } });
  const submissionIds = submissions.map((s) => s.id);

  const artifacts = await prisma.artifact.findMany({
    where: { submissionId: { in: submissionIds } },
    select: { originalPath: true },
  });
  for (const artifact of artifacts) {
    await deleteUploadedFile(artifact.originalPath);
  }

  // Tiket konsultasi & masukan siswa (Feedback) yang menyinggung sesi ini tidak
  // ikut dihapus — riwayat percakapan dan testimoni tetap ada, cuma tautan ke
  // sesi/submission yang sudah tidak ada ini dilepas.
  await withRetry(() =>
    prisma.$transaction([
      prisma.consultTicket.updateMany({
        where: { submissionId: { in: submissionIds } },
        data: { submissionId: null },
      }),
      prisma.feedback.updateMany({
        where: { submissionId: { in: submissionIds } },
        data: { submissionId: null },
      }),
      prisma.teacherReview.deleteMany({ where: { score: { submissionId: { in: submissionIds } } } }),
      prisma.score.deleteMany({ where: { submissionId: { in: submissionIds } } }),
      prisma.featureSet.deleteMany({ where: { artifact: { submissionId: { in: submissionIds } } } }),
      prisma.artifact.deleteMany({ where: { submissionId: { in: submissionIds } } }),
      prisma.characterReading.deleteMany({ where: { submissionId: { in: submissionIds } } }),
      prisma.submission.deleteMany({ where: { sessionId } }),
      prisma.sessionStudent.deleteMany({ where: { sessionId } }),
      prisma.session.delete({ where: { id: sessionId } }),
    ])
  );

  revalidatePath("/guru");
}
