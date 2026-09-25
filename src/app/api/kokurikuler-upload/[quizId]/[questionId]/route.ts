import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { EXTRACTOR_VERSION, extractFeatures, runQualityGate } from "@/lib/analysis";
import { overallWritingQuality, scoreAspects } from "@/lib/rubric";
import { withRetry } from "@/lib/dbRetry";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, looksLikeAcceptedImage } from "@/lib/imageValidation";

export const runtime = "nodejs";

// Foto jawaban uraian kokurikuler — mirror /api/upload/[submissionId] tapi
// terikat ke KokurikulerAnswer (satu per soal URAIAN), bukan Submission
// literasi. Lihat file itu untuk penjelasan pola retry/safety-net di bawah.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    return await handleUpload(req, ctx);
  } catch (e) {
    console.error("Upload foto uraian kokurikuler gagal tak terduga:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan tak terduga di server. Coba unggah ulang." },
      { status: 500 }
    );
  }
}

async function handleUpload(req: NextRequest, ctx: { params: Promise<{ quizId: string; questionId: string }> }) {
  const { quizId, questionId } = await ctx.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const student = await withRetry(() => prisma.student.findUnique({ where: { id: session.user.id } }));
  if (!student) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const quiz = await withRetry(() =>
    prisma.kokurikulerQuiz.findUnique({
      where: { id: quizId },
      include: { targetedStudents: true, worksheetTemplate: true },
    })
  );
  if (!quiz || quiz.classId !== student.classId) {
    return NextResponse.json({ error: "Kuis tidak ditemukan" }, { status: 404 });
  }
  if (quiz.status !== "OPEN") {
    return NextResponse.json({ error: "Kuis tidak sedang dibuka" }, { status: 403 });
  }
  const now = new Date();
  if (now < quiz.opensAt || now > quiz.closesAt) {
    return NextResponse.json({ error: "Di luar waktu pengerjaan" }, { status: 403 });
  }
  if (quiz.targetedStudents.length > 0 && !quiz.targetedStudents.some((t) => t.studentId === student.id)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  if (!quiz.worksheetTemplate) {
    return NextResponse.json(
      { error: "Kuis ini belum diatur untuk unggah foto jawaban uraian." },
      { status: 400 }
    );
  }

  const question = await prisma.kokurikulerQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.quizId !== quizId || question.type !== "URAIAN") {
    return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  }

  const existingAttempt = await prisma.kokurikulerAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
  });
  if (existingAttempt?.submittedAt) {
    return NextResponse.json({ error: "Kuis untuk sesi ini sudah dikumpulkan." }, { status: 409 });
  }
  const attempt =
    existingAttempt ?? (await prisma.kokurikulerAttempt.create({ data: { quizId, studentId: student.id } }));

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca berkas yang diunggah (koneksi mungkin terputus di tengah unggah). Coba lagi." },
      { status: 400 }
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Berkas lebih dari 10MB" }, { status: 400 });
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format berkas harus JPG, PNG, atau HEIC" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeAcceptedImage(buffer, file.type)) {
    return NextResponse.json({ error: "Berkas bukan gambar yang valid untuk format yang dipilih." }, { status: 400 });
  }

  let gate: Awaited<ReturnType<typeof runQualityGate>>;
  try {
    gate = await runQualityGate(buffer);
  } catch {
    return NextResponse.json(
      {
        error:
          "Foto tidak dapat dibaca (mungkin rusak atau format tidak didukung). Coba foto ulang dengan format JPG atau PNG.",
      },
      { status: 422 }
    );
  }

  let publicPath: string;
  try {
    publicPath = await saveUploadedFile(
      `uploads/kokurikuler/${attempt.id}/${questionId}/${Date.now()}.jpg`,
      buffer,
      "image/jpeg"
    );
  } catch (e) {
    console.error("Gagal menyimpan foto jawaban uraian ke penyimpanan:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan foto ke penyimpanan server. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }

  const answer = await prisma.kokurikulerAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
    update: {},
    create: { attemptId: attempt.id, questionId, answerText: null, isCorrect: null },
  });

  // Unggah ulang: KokurikulerArtifact 1:1 dengan jawaban — buang yang lama
  // (berkas fisik + baris DB) sebelum membuat yang baru.
  const oldArtifact = await prisma.kokurikulerArtifact.findUnique({ where: { answerId: answer.id } });
  if (oldArtifact) {
    await deleteUploadedFile(oldArtifact.originalPath);
    await prisma.kokurikulerFeatureSet.deleteMany({ where: { artifactId: oldArtifact.id } });
    await prisma.kokurikulerArtifact.delete({ where: { id: oldArtifact.id } });
  }

  if (!gate.accepted) {
    await prisma.kokurikulerArtifact.create({
      data: {
        answerId: answer.id,
        originalPath: publicPath,
        qualityFlags: JSON.stringify(gate.flags),
        accepted: false,
        ruledLinesDetected: 0,
        calibrationMethod: "unavailable",
      },
    });
    return NextResponse.json({ accepted: false, flags: gate.flags }, { status: 422 });
  }

  let calibration: Awaited<ReturnType<typeof extractFeatures>>["calibration"];
  let features: Awaited<ReturnType<typeof extractFeatures>>["features"];
  let rejected: Awaited<ReturnType<typeof extractFeatures>>["rejected"];
  try {
    ({ calibration, features, rejected } = await extractFeatures(buffer, {
      lineHeightMm: quiz.worksheetTemplate.lineHeightMm,
      minWords: quiz.worksheetTemplate.minWords,
    }));
  } catch {
    return NextResponse.json(
      {
        error:
          "Foto lolos pengecekan awal tapi gagal dianalisis lebih lanjut. Coba foto ulang dengan pencahayaan lebih rata.",
      },
      { status: 422 }
    );
  }

  const artifact = await prisma.kokurikulerArtifact.create({
    data: {
      answerId: answer.id,
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

  const aspects = scoreAspects(features);
  const writingQuality = overallWritingQuality(aspects);

  await prisma.kokurikulerFeatureSet.create({
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
      aspectsJson: JSON.stringify(aspects),
      writingQuality: writingQuality ?? null,
    },
  });

  return NextResponse.json({ accepted: true, writingQuality, aspects });
}
