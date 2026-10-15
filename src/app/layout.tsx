import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Font dipasang di dalam proyek (subset latin, berkas dari Google Fonts), bukan
// diunduh saat build: build di Hostinger sesekali gagal karena respons Google
// Fonts tidak lengkap ("next/font ... Cannot read properties of null").
const display = localFont({
  variable: "--font-display",
  src: [{ path: "./fonts/BricolageGrotesque-latin.woff2", weight: "200 800", style: "normal" }],
  display: "swap",
  adjustFontFallback: "Arial",
});

const body = localFont({
  variable: "--font-body",
  src: [{ path: "./fonts/PlusJakartaSans-latin.woff2", weight: "200 800", style: "normal" }],
  display: "swap",
  adjustFontFallback: "Arial",
});

const tanganSiswa = localFont({
  variable: "--font-tangan-siswa",
  src: [{ path: "./fonts/HomemadeApple-latin.woff2", weight: "400", style: "normal" }],
  display: "swap",
});

const tanganGuru = localFont({
  variable: "--font-tangan-guru",
  src: [{ path: "./fonts/Caveat-600-latin.woff2", weight: "600", style: "normal" }],
  display: "swap",
});

const data = localFont({
  variable: "--font-data",
  src: [
    { path: "./fonts/IBMPlexMono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SINGO MBOIS · Sistem Grafologi Berbasis Literasi Dasar Siswa",
    template: "%s · SINGO MBOIS",
  },
  description:
    "SINGO MBOIS membantu siswa SMP Negeri 27 Malang mengenal potensi belajarnya lewat tulisan tangan: dibaca ahli, berfokus pada kekuatan positif, didukung pengukuran literasi berbasis penelitian terpublikasi.",
  openGraph: {
    title: "SINGO MBOIS · Sistem Grafologi Berbasis Literasi Dasar Siswa",
    description:
      "Kenali potensi belajarmu lewat tulisan tanganmu sendiri. Dibaca ahli, fokus pada kekuatan positif, dari SMP Negeri 27 Malang.",
    type: "website",
    locale: "id_ID",
    siteName: "SINGO MBOIS",
  },
  twitter: {
    card: "summary",
    title: "SINGO MBOIS · Sistem Grafologi Berbasis Literasi Dasar Siswa",
    description:
      "Kenali potensi belajarmu lewat tulisan tanganmu sendiri. Dari SMP Negeri 27 Malang.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${display.variable} ${body.variable} ${tanganSiswa.variable} ${tanganGuru.variable} ${data.variable}`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: some browser extensions (Grammarly, Dark
          Reader, etc.) inject attributes into <body> before React hydrates;
          this only silences that specific mismatch, not real ones. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
