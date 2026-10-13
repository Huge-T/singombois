"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/optimisticLock";
import { validatedLevelsInYear } from "@/lib/siswaTahunan";

function assertBk(role: string | undefined) {
  if (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

/** Kesimpulan tahunan siswa: satu per siswa per tahun ajaran. */
export async function saveConclusion(
  studentId: string,
  academicYearId: string,
  body: string,
  publish: boolean,
  expectedUpdatedAt: string | null
) {
  const session = await auth();
  assertBk(session?.user.role);
  if (!body.trim()) throw new Error("Isi kesimpulan tidak boleh kosong");

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== session!.user.schoolId) throw new Error("Siswa tidak ditemukan");

  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year || year.schoolId !== student.schoolId) throw new Error("Tahun ajaran tidak ditemukan");

  // Terbit hanya bila minimal satu level tes sudah divalidasi (pembacaan BK
  // terbit) di tahun ajaran itu — ditegakkan di server, bukan hanya tombol.
  if (publish) {
    const levels = await validatedLevelsInYear(studentId, academicYearId);
    if (levels.size === 0) {
      throw new Error(`Belum ada level tes yang tervalidasi di tahun ajaran ${year.label}, jadi belum bisa dipublikasikan`);
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
        data: { studentId, academicYearId, ...payload, publishedAt: publish ? new Date() : null },
      });
      conclusionId = created.id;
      newUpdatedAt = created.updatedAt;
    } catch {
      throw new ConflictError();
    }
  } else {
    const result = await prisma.finalConclusion.updateMany({
      where: { studentId, academicYearId, updatedAt: new Date(expectedUpdatedAt) },
      data: payload,
    });
    if (result.count === 0) throw new ConflictError();
    const updated = await prisma.finalConclusion.findUniqueOrThrow({
      where: { studentId_academicYearId: { studentId, academicYearId } },
    });
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
  revalidatePath("/bk/kesimpulan");
  revalidatePath("/bk");
  revalidatePath("/siswa/data-saya");

  return { updatedAt: newUpdatedAt.toISOString() };
}
