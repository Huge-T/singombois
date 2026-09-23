"use server";

import { revalidatePath } from "next/cache";
import { saveUploadedFile } from "@/lib/storage";
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

export interface MateriFormState {
  error?: string;
}

export async function addReadingText(_prev: MateriFormState, formData: FormData): Promise<MateriFormState> {
  const user = await requireCoordinator();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const gradeLevel = Number(formData.get("gradeLevel"));
  const theme = String(formData.get("theme") ?? "").trim();
  const estMinutes = Number(formData.get("estMinutes")) || 5;

  if (!title || body.length < 50) {
    return { error: "Judul wajib diisi dan isi bacaan minimal 50 karakter." };
  }

  await prisma.readingText.create({
    data: { schoolId: user.schoolId, title, body, gradeLevel, theme, estMinutes },
  });
  revalidatePath("/koordinator/materi");
  return {};
}

export async function addWorksheetTemplate(_prev: MateriFormState, formData: FormData): Promise<MateriFormState> {
  const user = await requireCoordinator();
  const name = String(formData.get("name") ?? "").trim();
  const lineHeightMm = Number(formData.get("lineHeightMm")) || 8;
  const minWords = Number(formData.get("minWords")) || 20;

  if (!name) return { error: "Nama template wajib diisi." };

  await prisma.worksheetTemplate.create({
    data: { schoolId: user.schoolId, name, lineHeightMm, minWords },
  });
  revalidatePath("/koordinator/materi");
  return {};
}

export async function addAudioMaterial(_prev: MateriFormState, formData: FormData): Promise<MateriFormState> {
  const user = await requireCoordinator();
  const title = String(formData.get("title") ?? "").trim();
  const transcript = String(formData.get("transcript") ?? "").trim();
  const file = formData.get("file");

  if (!title || !transcript) return { error: "Judul dan transkrip wajib diisi." };
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih berkas audio (MP3/M4A/WAV)." };

  const ext = file.name.split(".").pop() || "mp3";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileUrl = await saveUploadedFile(
    `audio/${filename}`,
    buffer,
    file.type || "audio/mpeg"
  );

  await prisma.audioMaterial.create({
    data: {
      schoolId: user.schoolId,
      title,
      transcript,
      fileUrl,
      durationS: 0,
      qcPassed: false,
      qcNote: "Menunggu uji dengar (AUD-2).",
    },
  });
  revalidatePath("/koordinator/materi");
  return {};
}

export async function toggleAudioQc(audioId: string, pass: boolean) {
  const user = await requireCoordinator();
  const audio = await prisma.audioMaterial.findUnique({ where: { id: audioId } });
  if (!audio || audio.schoolId !== user.schoolId) throw new Error("Materi audio tidak ditemukan");
  await prisma.audioMaterial.update({
    where: { id: audioId },
    data: {
      qcPassed: pass,
      qcNote: pass ? `Lolos uji dengar internal ${new Date().toLocaleDateString("id-ID")}.` : "Menunggu uji dengar (AUD-2).",
    },
  });
  revalidatePath("/koordinator/materi");
}
