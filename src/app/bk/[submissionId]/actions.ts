"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readUploadedFile } from "@/lib/storage";
import { ConflictError } from "@/lib/optimisticLock";
import { EXTRACTOR_VERSION, extractFeatures, runQualityGate } from "@/lib/analysis";
import { RUBRIC_VERSION, overallWritingQuality, pickFocusAspect, scoreAspects } from "@/lib/rubric";

function assertBk(role: string | undefined) {
  if (role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

export interface StrengthItem {
  title: string;
  detail: string;
}

export async function saveReading(
  submissionId: string,
  data: { strengths: StrengthItem[]; learningSuggestions: string; notes: string },
  publish: boolean,
  expectedUpdatedAt: string | null
) {
  const session = await auth();
  assertBk(session?.user.role);
  const readerId = session!.user.id;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { student: true },
  });
  if (!submission || submission.student.schoolId !== session!.user.schoolId) {
    throw new Error("Submission tidak ditemukan");
  }

  const strengths = data.strengths.filter((s) => s.title.trim() || s.detail.trim());
  const payload = {
    readerId,
    strengthsJson: JSON.stringify(strengths),
    learningSuggestions: data.learningSuggestions,
    notes: data.notes || null,
    status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    publishedAt: publish ? new Date() : undefined,
  };

  // Optimistic locking: cegah dua Guru BK saling menimpa draf tanpa sadar.
  let readingId: string;
  let newUpdatedAt: Date;
  if (expectedUpdatedAt === null) {
    try {
      const created = await prisma.characterReading.create({
        data: { submissionId, ...payload, publishedAt: publish ? new Date() : null },
      });
      readingId = created.id;
      newUpdatedAt = created.updatedAt;
    } catch {
      throw new ConflictError();
    }
  } else {
    const result = await prisma.characterReading.updateMany({
      where: { submissionId, updatedAt: new Date(expectedUpdatedAt) },
      data: payload,
    });
    if (result.count === 0) throw new ConflictError();
    const updated = await prisma.characterReading.findUniqueOrThrow({ where: { submissionId } });
    readingId = updated.id;
    newUpdatedAt = updated.updatedAt;
  }

  await prisma.auditLog.create({
    data: {
      userId: readerId,
      actorType: "staff",
      action: publish ? "PUBLISH_CHARACTER_READING" : "DRAFT_CHARACTER_READING",
      entity: "CharacterReading",
      entityId: readingId,
    },
  });

  revalidatePath(`/bk/${submissionId}`);
  revalidatePath("/bk");
  if (publish) {
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (submission) revalidatePath(`/siswa/sesi/${submission.sessionId}/hasil`);
  }

  return { updatedAt: newUpdatedAt.toISOString() };
}

export interface ReprocessState {
  error?: string;
  ok?: boolean;
}

/** Siswa/gurunya salah pilih "Gambar" di toggle Jenis karya padahal isinya
 *  tulisan tangan biasa — kalau dibiarkan, foto itu permanen dilewatkan dari
 *  ekstraksi fitur & indikasi Gestalt (lihat /api/upload: cabang GAMBAR sengaja
 *  tidak menganalisis apa pun). Tombol ini reprocess ulang foto yang SUDAH
 *  tersimpan sebagai TULISAN, tanpa perlu siswa foto ulang — mirror persis
 *  jalur TULISAN di /api/upload/[submissionId]. */
export async function reprocessArtifactAsTulisan(submissionId: string): Promise<ReprocessState> {
  const session = await auth();
  assertBk(session?.user.role);

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: true,
      session: { include: { worksheetTemplate: true } },
      artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!submission || submission.student.schoolId !== session!.user.schoolId) {
    return { error: "Submission tidak ditemukan" };
  }

  const artifact = submission.artifacts[0];
  if (!artifact) return { error: "Tidak ada berkas untuk diproses ulang" };
  if (artifact.kind !== "GAMBAR") return { error: "Berkas ini sudah berupa tulisan" };

  let buffer: Buffer;
  try {
    buffer = await readUploadedFile(artifact.originalPath);
  } catch (e) {
    console.error("Gagal mengambil ulang berkas untuk reprocess:", e);
    return { error: "Gagal mengambil ulang berkas foto dari penyimpanan." };
  }

  let gate: Awaited<ReturnType<typeof runQualityGate>>;
  try {
    gate = await runQualityGate(buffer);
  } catch {
    return { error: "Foto tidak dapat dibaca ulang (mungkin rusak atau format tidak didukung)." };
  }

  if (!gate.accepted) {
    await prisma.artifact.update({
      where: { id: artifact.id },
      data: { kind: "TULISAN", qualityFlags: JSON.stringify(gate.flags), accepted: false },
    });
    revalidatePath(`/bk/${submissionId}`);
    return { error: "Diproses ulang sebagai tulisan, tapi foto tidak lolos cek kualitas: " + gate.flags.map((f) => f.message).join(" ") };
  }

  let calibration: Awaited<ReturnType<typeof extractFeatures>>["calibration"];
  let features: Awaited<ReturnType<typeof extractFeatures>>["features"];
  let rejected: Awaited<ReturnType<typeof extractFeatures>>["rejected"];
  try {
    ({ calibration, features, rejected } = await extractFeatures(buffer, {
      lineHeightMm: submission.session.worksheetTemplate.lineHeightMm,
      minWords: submission.session.worksheetTemplate.minWords,
    }));
  } catch {
    return { error: "Foto lolos cek kualitas tapi gagal dianalisis lebih lanjut." };
  }

  await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      kind: "TULISAN",
      qualityFlags: JSON.stringify(gate.flags),
      accepted: true,
      ruledLinesDetected: calibration.ruledLinesDetected,
      mmPerPx: calibration.mmPerPx,
      calibrationMethod: calibration.method,
    },
  });

  if (rejected) {
    revalidatePath(`/bk/${submissionId}`);
    return { error: `Diproses ulang sebagai tulisan, tapi ${rejected}` };
  }

  await prisma.featureSet.create({
    data: {
      artifactId: artifact.id,
      extractorVersion: EXTRACTOR_VERSION,
      featuresJson: JSON.stringify(features),
      confidenceJson: JSON.stringify(
        Object.fromEntries(
          Object.entries(features)
            .filter(([, v]) => typeof v === "object" && v !== null && "confidence" in v)
            .map(([k, v]) => [k, (v as { confidence: number }).confidence])
        )
      ),
    },
  });

  const aspects = scoreAspects(features);
  const writingQuality = overallWritingQuality(aspects);
  const focus = pickFocusAspect(aspects);

  await prisma.score.create({
    data: {
      submissionId,
      rubricVersion: RUBRIC_VERSION,
      writingQuality: writingQuality ?? undefined,
      reading:
        submission.readingTotal && submission.readingTotal > 0
          ? Math.round(((submission.readingCorrect ?? 0) / submission.readingTotal) * 100)
          : undefined,
      listening:
        submission.listeningTotal && submission.listeningTotal > 0
          ? Math.round(((submission.listeningCorrect ?? 0) / submission.listeningTotal) * 100)
          : undefined,
      aspectsJson: JSON.stringify(aspects),
      machineGenerated: true,
    },
  });

  if (focus) {
    const exerciseModule = await prisma.exerciseModule.findFirst({ where: { aspect: focus.key } });
    if (exerciseModule) {
      await prisma.exerciseAssignment.create({
        data: { studentId: submission.studentId, moduleId: exerciseModule.id, reasonAspect: focus.key },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "REPROCESS_ARTIFACT_AS_TULISAN",
      entity: "Artifact",
      entityId: artifact.id,
    },
  });

  revalidatePath(`/bk/${submissionId}`);
  revalidatePath("/bk");
  revalidatePath("/guru/tinjau");
  return { ok: true };
}
