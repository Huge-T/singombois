"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWibDateTimeLocal } from "@/lib/wibTime";
import { z } from "zod";

const schema = z.object({
  mode: z.enum(["LOW", "MIDDLE", "HIGH", "UMUM"]),
  readingTextId: z.string().optional(),
  audioMaterialId: z.string().optional(),
  storyPromptId: z.string().optional(),
  worksheetTemplateId: z.string().min(1),
  label: z.string().min(3),
  opensAt: z.string().min(1),
  closesAt: z.string().min(1),
});

export interface CreateSessionState {
  error?: string;
}

export async function createSession(_prev: CreateSessionState, formData: FormData): Promise<CreateSessionState> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
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
  // Target siswa individual cuma masuk akal untuk satu kelas — kalau guru
  // pilih beberapa kelas sekaligus, sesi otomatis berlaku untuk semua siswa
  // di tiap kelas (tidak ada penargetan per-siswa untuk pembuatan massal ini).
  if (studentIds.length > 0 && classIds.length > 1) {
    return { error: "Penargetan siswa tertentu hanya bisa dipakai untuk satu kelas." };
  }

  // Kebutuhan materi per mode: Low = teks + audio + gambar bercerita;
  // Middle/High = audio + gambar bercerita; Umum (literasi lama) = teks + audio.
  if (d.mode === "LOW" && (!d.readingTextId || !d.audioMaterialId || !d.storyPromptId)) {
    return { error: "Level Low membutuhkan teks bacaan, audio menyimak, dan gambar bercerita." };
  }
  if ((d.mode === "MIDDLE" || d.mode === "HIGH") && (!d.audioMaterialId || !d.storyPromptId)) {
    return { error: "Level Middle/High membutuhkan audio menyimak dan gambar bercerita." };
  }
  if (d.mode === "UMUM" && (!d.readingTextId || !d.audioMaterialId)) {
    return { error: "Sesi literasi umum membutuhkan teks bacaan dan audio menyimak." };
  }

  if (d.audioMaterialId) {
    const audio = await prisma.audioMaterial.findUnique({ where: { id: d.audioMaterialId } });
    if (!audio?.qcPassed) {
      return { error: "Audio yang dipilih belum lolos uji dengar (AUD-2). Pilih audio lain atau minta koordinator meluluskannya." };
    }
  }

  const validClassCount = await prisma.class.count({
    where: { id: { in: classIds }, schoolId: session.user.schoolId },
  });
  if (validClassCount !== classIds.length) {
    return { error: "Ada kelas terpilih yang tidak ditemukan." };
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

  const createdSessions = await Promise.all(
    classIds.map((classId) =>
      prisma.session.create({
        data: {
          classId,
          level: d.mode === "UMUM" ? "LOW" : d.mode,
          readingTextId: d.readingTextId || null,
          audioMaterialId: d.audioMaterialId || null,
          storyPromptId: d.mode === "UMUM" ? null : d.storyPromptId || null,
          worksheetTemplateId: d.worksheetTemplateId,
          label: d.label,
          opensAt,
          closesAt,
          createdById: session.user.id,
          status: "OPEN",
          targetedStudents:
            studentIds.length > 0 ? { create: studentIds.map((id) => ({ studentId: id })) } : undefined,
        },
      })
    )
  );

  // Satu kelas: langsung ke cetak lembar kerja seperti alur lama. Beberapa
  // kelas sekaligus: tiap kelas butuh lembar kerjanya sendiri, jadi arahkan
  // ke daftar sesi supaya guru bisa buka cetak per kelas satu-satu.
  if (createdSessions.length === 1) {
    redirect(`/guru/sesi/${createdSessions[0].id}/cetak`);
  }
  redirect("/guru");
}
