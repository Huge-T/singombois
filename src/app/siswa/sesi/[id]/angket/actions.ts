"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AngketFormState {
  error?: string;
}

const AWARENESS = new Set(["TAHU", "PERNAH_DENGAR", "TIDAK_TAHU"]);
const CONSENT = new Set(["DENGAN_NAMA", "ANONIM", "TIDAK"]);

export async function submitAngket(
  sessionId: string,
  _prev: AngketFormState,
  formData: FormData
): Promise<AngketFormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return { error: "Tidak diizinkan." };
  }

  const submission = await prisma.submission.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: session.user.id } },
  });
  if (!submission || !submission.submittedAt) {
    return { error: "Selesaikan dulu sesimu sebelum mengisi angket." };
  }

  const awareness = String(formData.get("awareness") ?? "");
  const clarityScore = Number(formData.get("clarityScore"));
  const impression = String(formData.get("impression") ?? "").trim();
  const suggestion = String(formData.get("suggestion") ?? "").trim();
  const displayConsent = String(formData.get("displayConsent") ?? "");

  if (!AWARENESS.has(awareness)) return { error: "Pilih jawaban pertanyaan 1." };
  if (!Number.isInteger(clarityScore) || clarityScore < 1 || clarityScore > 5) {
    return { error: "Pilih skala 1 sampai 5 di pertanyaan 2." };
  }
  if (!impression) return { error: "Ceritakan kesanmu di pertanyaan 3." };
  if (!CONSENT.has(displayConsent)) return { error: "Pilih boleh-tidaknya jawabanmu ditampilkan." };

  await prisma.feedback.upsert({
    where: { studentId_submissionId: { studentId: session.user.id, submissionId: submission.id } },
    update: {
      awareness: awareness as "TAHU",
      clarityScore,
      impression,
      suggestion: suggestion || null,
      displayConsent: displayConsent as "ANONIM",
      approved: false, // edit ulang harus dimoderasi ulang
    },
    create: {
      studentId: session.user.id,
      submissionId: submission.id,
      awareness: awareness as "TAHU",
      clarityScore,
      impression,
      suggestion: suggestion || null,
      displayConsent: displayConsent as "ANONIM",
    },
  });

  revalidatePath(`/siswa/sesi/${sessionId}/hasil`);
  revalidatePath("/koordinator/tanggapan");
  redirect(`/siswa/sesi/${sessionId}/hasil?angket=terkirim`);
}
