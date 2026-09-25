"use server";

import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { deleteStudentArtifacts } from "@/lib/consent";
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
  const user = await requireCoordinator();
  const status = granted ? "GRANTED" : "REVOKED";

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) throw new Error("Siswa tidak ditemukan");

  // PRIV-2: mencabut lewat koordinator harus punya efek sama dengan siswa
  // mencabut sendiri — hapus artefak fisik, bukan cuma ubah status.
  if (!granted) {
    await deleteStudentArtifacts(studentId);
  }

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

/**
 * Hapus siswa permanen (bukan cuma cabut persetujuan) — dipakai untuk
 * membersihkan data dobel (mis. NISN sama tapi beda format angka 0 di depan
 * dari impor CSV berulang). Menghapus semua data terkait dulu supaya tidak
 * kena constraint foreign key, lalu baris siswanya sendiri.
 */
export async function deleteStudent(studentId: string) {
  const user = await requireCoordinator();

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) throw new Error("Siswa tidak ditemukan");

  await deleteStudentArtifacts(studentId);

  try {
    await prisma.$transaction([
      prisma.characterReading.deleteMany({ where: { submission: { studentId } } }),
      prisma.consultMessage.deleteMany({ where: { ticket: { studentId } } }),
      prisma.consultTicket.deleteMany({ where: { studentId } }),
      prisma.feedback.deleteMany({ where: { studentId } }),
      prisma.finalConclusion.deleteMany({ where: { studentId } }),
      prisma.exerciseAssignment.deleteMany({ where: { studentId } }),
      prisma.sessionStudent.deleteMany({ where: { studentId } }),
      prisma.kokurikulerReading.deleteMany({ where: { attempt: { studentId } } }),
      prisma.kokurikulerAnswer.deleteMany({ where: { attempt: { studentId } } }),
      prisma.kokurikulerAttempt.deleteMany({ where: { studentId } }),
      prisma.kokurikulerQuizStudent.deleteMany({ where: { studentId } }),
      prisma.consent.deleteMany({ where: { studentId } }),
      prisma.submission.deleteMany({ where: { studentId } }),
      prisma.student.delete({ where: { id: studentId } }),
    ]);
  } catch {
    throw new Error("Gagal menghapus siswa — masih ada data terkait yang tidak terduga.");
  }

  revalidatePath("/koordinator/siswa");
}

/** Setujui sekaligus semua siswa berstatus PENDING di satu kelas — tidak
 *  menyentuh yang sudah DICABUT (itu perlu keputusan sadar per siswa). */
export async function approveAllPendingConsent(classId: string, guardianNote: string): Promise<number> {
  const user = await requireCoordinator();

  const targetClass = await prisma.class.findUnique({ where: { id: classId } });
  if (!targetClass || targetClass.schoolId !== user.schoolId) throw new Error("Kelas tidak ditemukan.");

  const pendingStudents = await prisma.student.findMany({
    where: { classId, schoolId: user.schoolId, consentStatus: "PENDING", archivedAt: null },
    select: { id: true },
  });
  if (pendingStudents.length === 0) return 0;

  const name = guardianNote.trim() || "Wali murid (disetujui massal)";
  const grantedAt = new Date();

  await prisma.$transaction([
    prisma.student.updateMany({
      where: { id: { in: pendingStudents.map((s) => s.id) } },
      data: { consentStatus: "GRANTED" },
    }),
    prisma.consent.createMany({
      data: pendingStudents.map((s) => ({
        studentId: s.id,
        guardianName: name,
        status: "GRANTED" as const,
        grantedAt,
      })),
    }),
  ]);

  revalidatePath("/koordinator/siswa");
  return pendingStudents.length;
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

export async function renameClass(classId: string, newName: string): Promise<string> {
  const user = await requireCoordinator();
  const name = newName.trim();
  if (!name) throw new Error("Nama kelas wajib diisi.");

  const targetClass = await prisma.class.findUnique({ where: { id: classId } });
  if (!targetClass || targetClass.schoolId !== user.schoolId) throw new Error("Kelas tidak ditemukan.");

  const duplicate = await prisma.class.findFirst({
    where: { schoolId: user.schoolId, name, id: { not: classId } },
  });
  if (duplicate) throw new Error(`Kelas "${name}" sudah ada.`);

  const updated = await prisma.class.update({ where: { id: classId }, data: { name } });
  revalidatePath("/koordinator/siswa");
  return updated.name;
}

export async function deleteClass(classId: string) {
  const user = await requireCoordinator();

  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true } } },
  });
  if (!targetClass || targetClass.schoolId !== user.schoolId) throw new Error("Kelas tidak ditemukan.");
  if (targetClass._count.students > 0) {
    throw new Error("Kelas masih punya siswa — pindahkan atau hapus siswanya dulu sebelum menghapus kelas.");
  }

  try {
    await prisma.class.delete({ where: { id: classId } });
  } catch {
    throw new Error("Kelas tidak bisa dihapus karena masih punya sesi/kuis yang terkait dengannya.");
  }

  revalidatePath("/koordinator/siswa");
}

export interface ImportState {
  error?: string;
  createdCount?: number;
  skippedCount?: number;
  emptyCount?: number;
  duplicateCount?: number;
}

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB, jauh lebih dari cukup untuk ribuan baris siswa

// Nama kolom diterima dalam beberapa varian umum (huruf besar/kecil, spasi,
// atau ekspor Excel/Sheets yang menamai kolom sedikit berbeda) — supaya
// koordinator tidak perlu menyesuaikan CSV mereka persis ke satu nama kolom.
const NAME_HEADER_ALIASES = ["nama", "name", "nama siswa", "nama lengkap"];
const NISN_HEADER_ALIASES = ["nisn", "no nisn", "no. nisn", "no induk siswa nasional"];

function normalizeHeader(h: string): string {
  // Excel/Google Sheets sering menyisipkan BOM (﻿) di kolom pertama saat
  // ekspor CSV UTF-8 — tanpa dibersihkan, kolom pertama gagal cocok sama sekali.
  return h.replace(/^﻿/, "").trim().toLowerCase();
}

function pickField(row: Record<string, string>, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    if (aliases.includes(normalizeHeader(key))) {
      const value = (row[key] ?? "").trim();
      if (value) return value;
    }
  }
  return "";
}

// NISN standar 10 digit. Excel/Sheets sering menganggap kolom NISN sebagai
// angka lalu menghapus angka 0 di depan saat disimpan ulang — tanpa ini,
// "0111075727" dan "111075727" dianggap dua siswa berbeda padahal orang yang
// sama, menghasilkan data siswa dobel tiap kali CSV diekspor ulang dan diimpor.
function normalizeNisn(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed) && trimmed.length < 10) {
    return trimmed.padStart(10, "0");
  }
  return trimmed;
}

export async function importStudentsCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireCoordinator();
  const classId = String(formData.get("classId") ?? "");
  const file = formData.get("file");

  if (!classId) return { error: "Pilih kelas tujuan." };
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih berkas CSV (kolom: nama, nisn)." };
  if (file.size > MAX_CSV_BYTES) return { error: "Berkas CSV lebih dari 2MB." };

  const targetClass = await prisma.class.findUnique({ where: { id: classId } });
  if (!targetClass || targetClass.schoolId !== user.schoolId) return { error: "Kelas tujuan tidak ditemukan." };

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { error: `CSV tidak valid: ${parsed.errors[0].message}` };
  }
  if (parsed.data.length === 0) {
    return { error: "Berkas CSV tidak berisi baris data." };
  }

  let created = 0;
  let emptyCount = 0;
  let duplicateCount = 0;

  for (const row of parsed.data) {
    const name = pickField(row, NAME_HEADER_ALIASES);
    const nisn = normalizeNisn(pickField(row, NISN_HEADER_ALIASES));
    if (!name || !nisn) {
      emptyCount++;
      continue;
    }
    const exists = await prisma.student.findUnique({ where: { nisn } });
    if (exists) {
      duplicateCount++;
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

  // Semua baris kosong & tidak ada yang duplikat = hampir pasti nama kolom
  // di CSV tidak cocok, bukan datanya yang salah. Tunjukkan kolom yang
  // terdeteksi supaya koordinator bisa langsung membetulkan headernya.
  if (created === 0 && duplicateCount === 0 && emptyCount === parsed.data.length) {
    const detectedHeaders = Object.keys(parsed.data[0]).join(", ");
    return {
      error: `Semua ${emptyCount} baris dilewati karena kolom "nama"/"nisn" tidak ditemukan. Kolom yang terbaca dari berkas: ${detectedHeaders}. Pastikan baris pertama CSV persis berisi header "nama" dan "nisn".`,
    };
  }

  revalidatePath("/koordinator/siswa");
  return { createdCount: created, skippedCount: emptyCount + duplicateCount, emptyCount, duplicateCount };
}
