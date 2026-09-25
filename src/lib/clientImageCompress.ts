// Vercel menolak body request di atas kira-kira 4.5MB di level platform,
// sebelum kode route manapun sempat jalan (respons plain-text non-JSON,
// bukan JSON error yang rapi) — foto kamera HP modern rutin 3-8MB, jadi
// kompres dulu di browser supaya jauh di bawah batas itu. Kalau browser
// gagal mendekode (mis. HEIC di Chrome), kirim berkas asli apa adanya dan
// biarkan server yang menolak dengan pesan yang jelas.
const UPLOAD_SKIP_COMPRESS_BYTES = 1.5 * 1024 * 1024;
const UPLOAD_TARGET_BYTES = 2 * 1024 * 1024;
const UPLOAD_MAX_DIMENSION = 2000;

export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_SKIP_COMPRESS_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > UPLOAD_MAX_DIMENSION || height > UPLOAD_MAX_DIMENSION) {
      const scale = UPLOAD_MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    for (let i = 0; i < 4; i++) {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) return file;
      if (blob.size <= UPLOAD_TARGET_BYTES || quality <= 0.4) {
        const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], newName, { type: "image/jpeg" });
      }
      quality -= 0.15;
    }
    return file;
  } catch {
    return file;
  }
}
