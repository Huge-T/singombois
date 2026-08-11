"use server";

import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireCoordinator() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Tidak diizinkan");
  }
  return session.user;
}

export async function setConsent(studentId: string, granted: boolean, guardianName: string) {
  await requireCoordinator();
  const status = granted ? "GRANTED" : "REVOKED";

  await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: { consentStatus: status } }),
    prisma.consent.create({
      data: {
        studentId,
        guardianName: guardianName || "Wali murid",
        status,
        grantedAt: granted ? new Date() : null,
        revokedAt: granted ? null : new Date(),
      },
    }),
  ]);
  revalidatePath("/koordinator/siswa");
}

export interface AddClassState {
  error?: string;
  createdName?: string;
}

export async function addClass(_prev: AddClassState, formData: FormData): Promise<AddClassState> {
  const user = await requireCoordinator();
  const name = String(formData.get("name") ?? "").trim();
  const grade = Number(formData.get("grade"));

  if (!name) return { error: "Nama kelas wajib diisi (mis. VII-D)." };
  if (!Number.isInteger(grade) || grade < 7 || grade > 9) {
    return { error: "Tingkat harus 7, 8, atau 9." };
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: user.schoolId, active: true },
  });
  if (!academicYear) {
    return { error: "Tidak ada tahun ajaran aktif untuk sekolah ini. Hubungi pengembang." };
  }

  const exists = await prisma.class.findFirst({ where: { schoolId: user.schoolId, name } });
  if (exists) return { error: `Kelas "${name}" sudah ada.` };

  const created = await prisma.class.create({
    data: { schoolId: user.schoolId, academicYearId: academicYear.id, grade, name },
  });

  revalidatePath("/koordinator/siswa");
  return { createdName: created.name };
}

export interface ImportState {
  error?: string;
  createdCount?: number;
  skippedCount?: number;
}

export async function importStudentsCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireCoordinator();
  const classId = String(formData.get("classId") ?? "");
  const file = formData.get("file");

  if (!classId) return { error: "Pilih kelas tujuan." };
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih berkas CSV (kolom: nama, nisn)." };

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { error: `CSV tidak valid: ${parsed.errors[0].message}` };
  }

  let created = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const name = (row.nama || row.name || "").trim();
    const nisn = (row.nisn || row.NISN || "").trim();
    if (!name || !nisn) {
      skipped++;
      continue;
    }
    const exists = await prisma.student.findUnique({ where: { nisn } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.student.create({
      data: {
        schoolId: user.schoolId,
        classId,
        name,
        nisn,
        pinHash: await bcrypt.hash("1234", 10),
        consentStatus: "PENDING",
      },
    });
    created++;
  }

  revalidatePath("/koordinator/siswa");
  return { createdCount: created, skippedCount: skipped };
}
