import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { EXTRACTOR_VERSION, extractFeatures, runQualityGate } from "@/lib/analysis";
import { RUBRIC_VERSION, overallWritingQuality, pickFocusAspect, scoreAspects } from "@/lib/rubric";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // UP-1: max 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await ctx.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: true,
      session: { include: { worksheetTemplate: true } },
    },
  });
  if (!submission || submission.studentId !== session.user.id) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // DATA-4: no consent, no upload — not just a warning, a hard block.
  if (submission.student.consentStatus !== "GRANTED") {
    return NextResponse.json(
      { error: "Persetujuan wali murid belum disetujui. Unggah lembar kerja diblokir." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "GAMBAR" ? "GAMBAR" : "TULISAN";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Berkas lebih dari 10MB" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format berkas harus JPG, PNG, atau HEIC" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const gate = await runQualityGate(buffer);

  const publicPath = await saveUploadedFile(
    `uploads/${submissionId}/${Date.now()}.jpg`,
    buffer,
    "image/jpeg"
  );

  if (!gate.accepted) {
    await prisma.artifact.create({
      data: {
        submissionId,
        kind,
        originalPath: publicPath,
        qualityFlags: JSON.stringify(gate.flags),
        accepted: false,
        ruledLinesDetected: 0,
        calibrationMethod: "unavailable",
      },
    });
    return NextResponse.json({ accepted: false, flags: gate.flags }, { status: 422 });
  }

  // Gambar (drawing/GAMBAR) dilewatkan dari ekstraksi fitur tulisan tangan & skoring
  // metrik: rubrik kerapian (jarak kata, baseline, dst.) tidak berlaku untuk gambar.
  // Tetap masuk antrean pembacaan BK lewat characterReading, hanya tanpa Score/FeatureSet.
  if (kind === "GAMBAR") {
    await prisma.artifact.create({
      data: {
        submissionId,
        kind,
        originalPath: publicPath,
        qualityFlags: JSON.stringify(gate.flags),
        accepted: true,
        ruledLinesDetected: 0,
        calibrationMethod: "not_applicable_gambar",
      },
    });
    await prisma.submission.update({ where: { id: submissionId }, data: { submittedAt: new Date() } });
    return NextResponse.json({ accepted: true, kind: "GAMBAR" });
  }

  const { calibration, features, rejected } = await extractFeatures(buffer, {
    lineHeightMm: submission.session.worksheetTemplate.lineHeightMm,
    minWords: submission.session.worksheetTemplate.minWords,
  });

  const artifact = await prisma.artifact.create({
    data: {
      submissionId,
      kind,
      originalPath: publicPath,
      qualityFlags: JSON.stringify(gate.flags),
      accepted: true,
      ruledLinesDetected: calibration.ruledLinesDetected,
      mmPerPx: calibration.mmPerPx,
      calibrationMethod: calibration.method,
    },
  });

  if (rejected) {
    return NextResponse.json({ accepted: false, flags: [{ code: "TOO_FEW_WORDS", message: rejected }] }, {
      status: 422,
    });
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

  const score = await prisma.score.create({
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

  await prisma.submission.update({
    where: { id: submissionId },
    data: { submittedAt: new Date() },
  });

  return NextResponse.json({ accepted: true, scoreId: score.id, writingQuality, aspects });
}
