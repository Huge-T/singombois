import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { EXTRACTOR_VERSION, extractFeatures, runQualityGate } from "@/lib/analysis";
import { RUBRIC_VERSION, overallWritingQuality, pickFocusAspect, scoreAspects } from "@/lib/rubric";
import { withRetry } from "@/lib/dbRetry";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, looksLikeAcceptedImage } from "@/lib/imageValidation";

export const runtime = "nodejs";

// Safety net: apa pun yang lolos dari try/catch spesifik di bawah tetap
// dikembalikan sebagai JSON, bukan halaman error 500 default Next.js —
// tanpa ini, res.json() di client gagal parse dan tombol upload macet
// permanen tanpa pesan (lihat SessionRunner.tsx handleUpload).
export async function POST(req: NextRequest, ctx: { params: Promise<{ submissionId: string }> }) {
  try {
    return await handleUpload(req, ctx);
  } catch (e) {
    console.error("Upload gagal tak terduga:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan tak terduga di server. Coba unggah ulang." },
      { status: 500 }
    );
  }
}

async function handleUpload(req: NextRequest, ctx: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await ctx.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const submission = await withRetry(() =>
    prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        session: { include: { worksheetTemplate: true } },
      },
    })
  );
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

  // Cegah unggah ganda (klik dobel, tombol back, atau panggilan API langsung)
  // menumpuk Artifact/Score baru untuk submission yang sudah selesai —
  // review guru yang sudah terikat ke skor lama jadi terputus dari tampilan.
  if (submission.submittedAt) {
    return NextResponse.json({ error: "Lembar kerja untuk sesi ini sudah dikumpulkan." }, { status: 409 });
  }

  const now = new Date();
  if (now < submission.session.opensAt || now > submission.session.closesAt) {
    return NextResponse.json({ error: "Sesi sudah tidak bisa dikerjakan (di luar jadwal buka/tutup)." }, { status: 403 });
  }

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
  const kind = formData.get("kind") === "GAMBAR" ? "GAMBAR" : "TULISAN";
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

  // sharp() melempar exception untuk foto rusak/format yang gagal didekode
  // server (mis. HEIC tanpa libheif) — tanpa try/catch ini jadi 500 non-JSON
  // yang bikin client macet menunggu res.json() selamanya (lihat SessionRunner).
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
    publicPath = await saveUploadedFile(`uploads/${submissionId}/${Date.now()}.jpg`, buffer, "image/jpeg");
  } catch (e) {
    console.error("Gagal menyimpan foto ke penyimpanan:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan foto ke penyimpanan server. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }

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

  let calibration: Awaited<ReturnType<typeof extractFeatures>>["calibration"];
  let features: Awaited<ReturnType<typeof extractFeatures>>["features"];
  let rejected: Awaited<ReturnType<typeof extractFeatures>>["rejected"];
  try {
    ({ calibration, features, rejected } = await extractFeatures(buffer, {
      lineHeightMm: submission.session.worksheetTemplate.lineHeightMm,
      minWords: submission.session.worksheetTemplate.minWords,
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
