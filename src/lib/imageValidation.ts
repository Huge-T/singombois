export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // UP-1: max 10MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];

// file.type dikirim client, mudah dipalsukan — cek magic bytes betulan
// sebagai lapisan tambahan sebelum buffer diproses lebih jauh.
export function looksLikeAcceptedImage(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return sig.every((b, i) => buffer[i] === b);
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    // ISO base media file format (HEIC/HEIF/MP4-family): byte 4-7 = "ftyp".
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}
