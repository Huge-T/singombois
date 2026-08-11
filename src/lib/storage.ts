import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Penyimpanan berkas unggahan (foto lembar jawaban, audio materi).
 *
 * Di Vercel disk fungsi serverless tidak permanen, jadi berkas disimpan ke
 * Vercel Blob — aktif otomatis saat BLOB_READ_WRITE_TOKEN tersedia (di-inject
 * Vercel ketika Blob store terpasang di proyek). Di pengembangan lokal tanpa
 * token, berkas jatuh ke `public/` seperti semula sehingga alur dev tidak
 * berubah. Nilai kembalian selalu URL yang bisa langsung dipakai di <img>/
 * <audio>: URL absolut (Blob) atau path publik lokal ("/uploads/...").
 */
function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUploadedFile(
  relPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const clean = relPath.replace(/\\/g, "/");
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const res = await put(clean, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return res.url;
  }
  const abs = path.join(process.cwd(), "public", clean);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return `/${clean}`;
}

/** Idempoten: berkas yang sudah tidak ada dianggap sukses terhapus. */
export async function deleteUploadedFile(storedUrl: string): Promise<void> {
  try {
    if (/^https?:\/\//.test(storedUrl)) {
      const { del } = await import("@vercel/blob");
      await del(storedUrl);
    } else {
      await unlink(path.join(process.cwd(), "public", storedUrl));
    }
  } catch {
    // PRIV-2: penghapusan tidak boleh gagal hanya karena berkas sudah hilang.
  }
}
