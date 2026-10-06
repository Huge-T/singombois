import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Penyimpanan berkas unggahan (foto lembar jawaban, foto kegiatan, audio
 * materi) di disk server. Lokasinya UPLOAD_DIR, HARUS di luar folder aplikasi:
 * di Hostinger setiap deploy membuat folder build baru dan menimpa isinya,
 * sedangkan di `next start` berkas yang ditambahkan ke public/ setelah server
 * menyala tidak ikut disajikan. Berkas disajikan lewat route /files/[...path].
 * Nilai kembalian saveUploadedFile adalah URL "/files/<relPath>" yang langsung
 * bisa dipakai di <img>/<audio>.
 *
 * Baris lama yang menyimpan URL Vercel Blob (https://...) tetap bisa dibaca
 * lewat readUploadedFile sampai dipindahkan oleh scripts/migrate-blob-files.ts.
 */
export const FILES_URL_PREFIX = "/files/";

export function uploadRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "uploads"));
}

/** Path absolut di dalam UPLOAD_DIR, atau null bila relPath mencoba keluar darinya. */
export function resolveUploadPath(relPath: string): string | null {
  if (relPath.includes("\0")) return null;
  const root = uploadRoot();
  const abs = path.resolve(/*turbopackIgnore: true*/ root, relPath);
  return abs.startsWith(root + path.sep) ? abs : null;
}

function relPathFromUrl(storedUrl: string): string | null {
  return storedUrl.startsWith(FILES_URL_PREFIX) ? storedUrl.slice(FILES_URL_PREFIX.length) : null;
}

export async function saveUploadedFile(
  relPath: string,
  buffer: Buffer,
  _contentType: string
): Promise<string> {
  const clean = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = resolveUploadPath(clean);
  if (!abs) throw new Error("Path berkas tidak valid");
  await mkdir(path.dirname(/*turbopackIgnore: true*/ abs), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ abs, buffer);
  return `${FILES_URL_PREFIX}${clean}`;
}

/** Idempoten: berkas yang sudah tidak ada dianggap sukses terhapus. URL lama
 *  (Vercel Blob) diabaikan karena bukan lagi tanggung jawab penyimpanan ini. */
export async function deleteUploadedFile(storedUrl: string): Promise<void> {
  try {
    const rel = relPathFromUrl(storedUrl);
    const abs = rel === null ? null : resolveUploadPath(rel);
    if (abs) await unlink(/*turbopackIgnore: true*/ abs);
  } catch {
    // PRIV-2: penghapusan tidak boleh gagal hanya karena berkas sudah hilang.
  }
}

/** Baca berkas tersimpan untuk diproses ulang di server. */
export async function readUploadedFile(storedUrl: string): Promise<Buffer> {
  const rel = relPathFromUrl(storedUrl);
  if (rel !== null) {
    const abs = resolveUploadPath(rel);
    if (!abs) throw new Error("Path berkas tidak valid");
    return readFile(/*turbopackIgnore: true*/ abs);
  }
  if (/^https?:\/\//.test(storedUrl)) {
    const res = await fetch(storedUrl);
    if (!res.ok) throw new Error(`fetch gagal: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Lokasi berkas tidak dikenali");
}
