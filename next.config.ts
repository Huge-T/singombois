import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Izinkan akses dev server lewat tunnel trycloudflare (untuk uji coba online).
  // Mode produksi (npm start) tidak terpengaruh opsi ini.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
