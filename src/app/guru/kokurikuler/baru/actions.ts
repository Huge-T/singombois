"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  classId: z.string().min(1),
  label: z.string().min(3),
  tema: z.string().optional(),
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
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);

  if (studentIds.length > 0) {
    const validCount = await prisma.student.count({
      where: { id: { in: studentIds }, classId: d.classId, archivedAt: null },
    });
    if (validCount !== studentIds.length) {
      return { error: "Ada siswa terpilih yang bukan anggota kelas ini." };
    }
  }

  const opensAt = new Date(d.opensAt);
  const closesAt = new Date(d.closesAt);
  if (closesAt <= opensAt) {
    return { error: "Waktu tutup harus setelah waktu buka" };
  }

  const created = await prisma.kokurikulerQuiz.create({
    data: {
      classId: d.classId,
      label: d.label,
      tema: d.tema || null,
      opensAt,
      closesAt,
      createdById: session.user.id,
      status: "DRAFT",
      targetedStudents:
        studentIds.length > 0 ? { create: studentIds.map((id) => ({ studentId: id })) } : undefined,
    },
  });

  redirect(`/guru/kokurikuler/${created.id}`);
}
