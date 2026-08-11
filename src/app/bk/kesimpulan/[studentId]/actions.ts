"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function saveConclusion(studentId: string, body: string, publish: boolean) {
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

  const conclusion = await prisma.finalConclusion.upsert({
    where: { studentId },
    update: {
      authorId: session!.user.id,
      body: body.trim(),
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : undefined,
    },
    create: {
      studentId,
      authorId: session!.user.id,
      body: body.trim(),
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: publish ? "PUBLISH_FINAL_CONCLUSION" : "DRAFT_FINAL_CONCLUSION",
      entity: "FinalConclusion",
      entityId: conclusion.id,
    },
  });

  revalidatePath(`/bk/kesimpulan/${studentId}`);
  revalidatePath("/bk");
  revalidatePath("/siswa/data-saya");
}
