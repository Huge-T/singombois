import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, looksLikeAcceptedImage } from "@/lib/imageValidation";

export const runtime = "nodejs";

// Foto dokumentasi kegiatan (bukan lembar jawaban) — tanpa quality gate atau
// ekstraksi fitur tulisan tangan, itu khusus untuk Submission/KokurikulerAnswer.
export async function POST(req: NextRequest, ctx: { params: Promise<{ activityId: string }> }) {
  try {
    return await handleUpload(req, ctx);
  } catch (e) {
    console.error("Upload foto kegiatan gagal tak terduga:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan tak terduga di server. Coba unggah ulang." },
      { status: 500 }
    );
  }
}

async function handleUpload(req: NextRequest, ctx: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await ctx.params;
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const activity = await withRetry(() => prisma.activity.findUnique({ where: { id: activityId } }));
  if (!activity || activity.schoolId !== session.user.schoolId) {
    return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
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

  let publicPath: string;
  try {
    publicPath = await saveUploadedFile(`uploads/kegiatan/${activityId}/${Date.now()}.jpg`, buffer, "image/jpeg");
  } catch (e) {
    console.error("Gagal menyimpan foto kegiatan ke penyimpanan:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan foto ke penyimpanan server. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }

  await prisma.activityPhoto.create({ data: { activityId, url: publicPath } });
  return NextResponse.json({ ok: true, url: publicPath });
}
