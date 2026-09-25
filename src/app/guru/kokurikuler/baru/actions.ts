"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWibDateTimeLocal } from "@/lib/wibTime";

const schema = z.object({
  label: z.string().min(3),
  tema: z.string().optional(),
  worksheetTemplateId: z.string().min(1),
  opensAt: z.string().min(1),
  closesAt: z.string().min(1),
});

export interface CreateQuizState {
  error?: string;
}

export async function createKokurikulerQuiz(_prev: CreateQuizState, formData: FormData): Promise<CreateQuizState> {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return { error: "Tidak diizinkan" };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const d = parsed.data;
  const classIds = formData.getAll("classIds").map(String).filter(Boolean);
  if (classIds.length === 0) {
    return { error: "Pilih minimal satu kelas." };
  }
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  // Penargetan siswa tertentu hanya masuk akal untuk satu kelas — kalau guru
  // pilih beberapa kelas sekaligus, kuis otomatis berlaku untuk semua siswa
  // di tiap kelas.
  if (studentIds.length > 0 && classIds.length > 1) {
    return { error: "Penargetan siswa tertentu hanya bisa dipakai untuk satu kelas." };
  }

  const validClassCount = await prisma.class.count({
    where: { id: { in: classIds }, schoolId: session.user.schoolId },
  });
  if (validClassCount !== classIds.length) {
    return { error: "Ada kelas terpilih yang tidak ditemukan." };
  }

  const template = await prisma.worksheetTemplate.findUnique({ where: { id: d.worksheetTemplateId } });
  if (!template || template.schoolId !== session.user.schoolId) {
    return { error: "Template lembar kerja tidak ditemukan." };
  }

  if (studentIds.length > 0) {
    const validCount = await prisma.student.count({
      where: { id: { in: studentIds }, classId: classIds[0], archivedAt: null },
    });
    if (validCount !== studentIds.length) {
      return { error: "Ada siswa terpilih yang bukan anggota kelas ini." };
    }
  }

  const opensAt = parseWibDateTimeLocal(d.opensAt);
  const closesAt = parseWibDateTimeLocal(d.closesAt);
  if (closesAt <= opensAt) {
    return { error: "Waktu tutup harus setelah waktu buka" };
  }

  const createdQuizzes = await Promise.all(
    classIds.map((classId) =>
      prisma.kokurikulerQuiz.create({
        data: {
          classId,
          label: d.label,
          tema: d.tema || null,
          worksheetTemplateId: d.worksheetTemplateId,
          opensAt,
          closesAt,
          createdById: session.user.id,
          status: "DRAFT",
          targetedStudents:
            studentIds.length > 0 ? { create: studentIds.map((id) => ({ studentId: id })) } : undefined,
        },
      })
    )
  );

  // Satu kelas: langsung ke halaman kuis untuk unggah soal seperti alur lama.
  // Beberapa kelas sekaligus: tiap kuis butuh soalnya sendiri-sendiri, jadi
  // arahkan ke daftar supaya guru bisa buka & unggah CSV per kuis satu-satu.
  if (createdQuizzes.length === 1) {
    redirect(`/guru/kokurikuler/${createdQuizzes[0].id}`);
  }
  redirect("/guru/kokurikuler");
}
