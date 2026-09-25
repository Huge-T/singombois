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
};

export default nextConfig;
