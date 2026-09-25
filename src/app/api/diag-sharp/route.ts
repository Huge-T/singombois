import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Diagnostik sementara: isolasi apakah sharp/libvips gagal load di runtime
// Vercel (beda dari lokal). Dihapus lagi setelah upload foto produksi normal.
// Import dinamis (bukan static di atas) supaya modul sharp tidak dimuat
// sampai benar-benar dipanggil di dalam try/catch ini.
export async function GET() {
  const info: Record<string, unknown> = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
  };
  try {
    const sharp = (await import("sharp")).default;
    info.importOk = true;
    try {
      info.sharpVersions = sharp.versions;
    } catch (e) {
      info.sharpVersionsError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    try {
      const buf = await sharp({
        create: { width: 20, height: 20, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .jpeg()
        .toBuffer();
      info.createAndEncodeOk = true;
      info.encodedBytes = buf.length;
    } catch (e) {
      info.createAndEncodeError =
        e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : String(e);
    }
  } catch (e) {
    info.importError = e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : String(e);
  }
  return NextResponse.json(info);
}
