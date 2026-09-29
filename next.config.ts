import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Izinkan akses dev server lewat tunnel trycloudflare (untuk uji coba online).
  // Mode produksi (npm start) tidak terpengaruh opsi ini.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // sharp punya binary native per-platform — kalau ikut di-bundle/trace oleh
  // Turbopack untuk route handler, binary linux-nya kadang tidak terbawa utuh
  // ke fungsi serverless Vercel dan sharp gagal di-load saat runtime (crash
  // generik sebelum kode kita sempat jalan). Biarkan Next.js require() dia
  // langsung dari node_modules saat runtime, bukan coba membundlenya.
  serverExternalPackages: ["sharp"],
  // serverExternalPackages saja belum cukup: terkonfirmasi lewat endpoint
  // diagnostik bahwa file .so asli libvips (nested di @img/sharp-libvips-*)
  // tetap tidak ikut ter-trace ke bundle fungsi Vercel (ERR_DLOPEN_FAILED).
  // Awalnya cuma "/api/**/*" — ternyata server action (bukan route API) yang
  // makan sharp (mis. reprocessArtifactAsTulisan di bk/[submissionId]/actions.ts)
  // dibundel di path lain dan tidak ikut ke-cover, jadi 500 generik yang sama.
  // Diperluas ke semua route supaya server action mana pun yang butuh sharp aman.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

export default nextConfig;
