"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/optimisticLock";

function assertBk(role: string | undefined) {
  if (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

/** Level Gestalt yang sudah tervalidasi (pembacaan BK terbit) untuk seorang siswa.
 *  Internal saja — bukan server action (Set tidak dapat diserialisasi ke klien). */
async function validatedLevels(studentId: string): Promise<Set<string>> {
  const rows = await prisma.submission.findMany({
    where: {
      studentId,
      session: { storyPromptId: { not: null } },
      characterReading: { status: "PUBLISHED" },
    },
    select: { session: { select: { level: true } } },
  });
  return new Set(rows.map((r) => r.session.level));
}

export async function saveConclusion(
  studentId: string,
  body: string,
  publish: boolean,
  expectedUpdatedAt: string | null
) {
  const session = await auth();
  assertBk(session?.user.role);
  if (!body.trim()) throw new Error("Isi kesimpulan tidak boleh kosong");

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== session!.user.schoolId) throw new Error("Siswa tidak ditemukan");

  // Kesimpulan akhir hanya boleh terbit setelah ketiga level selesai dan
  // masing-masing pembacaannya divalidasi (terbit) — ditegakkan di server.
  if (publish) {
    const levels = await validatedLevels(studentId);
    if (!(levels.has("LOW") && levels.has("MIDDLE") && levels.has("HIGH"))) {
      throw new Error("Ketiga level (Low, Middle, High) harus tervalidasi sebelum kesimpulan dipublikasikan");
    }
  }

  const payload = {
    authorId: session!.user.id,
    body: body.trim(),
    status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    publishedAt: publish ? new Date() : undefined,
  };

  // Optimistic locking: cegah dua Guru BK saling menimpa kesimpulan tanpa sadar.
  let conclusionId: string;
  let newUpdatedAt: Date;
  if (expectedUpdatedAt === null) {
    try {
      const created = await prisma.finalConclusion.create({
        data: { studentId, ...payload, publishedAt: publish ? new Date() : null },
      });
      conclusionId = created.id;
      newUpdatedAt = created.updatedAt;
    } catch {
      throw new ConflictError();
    }
  } else {
    const result = await prisma.finalConclusion.updateMany({
      where: { studentId, updatedAt: new Date(expectedUpdatedAt) },
      data: payload,
    });
    if (result.count === 0) throw new ConflictError();
    const updated = await prisma.finalConclusion.findUniqueOrThrow({ where: { studentId } });
    conclusionId = updated.id;
    newUpdatedAt = updated.updatedAt;
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: publish ? "PUBLISH_FINAL_CONCLUSION" : "DRAFT_FINAL_CONCLUSION",
      entity: "FinalConclusion",
      entityId: conclusionId,
    },
  });

  revalidatePath(`/bk/kesimpulan/${studentId}`);
  revalidatePath("/bk");
  revalidatePath("/siswa/data-saya");

  return { updatedAt: newUpdatedAt.toISOString() };
}
