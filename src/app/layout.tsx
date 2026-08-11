import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Plus_Jakarta_Sans,
  Homemade_Apple,
  Caveat,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const tanganSiswa = Homemade_Apple({
  variable: "--font-tangan-siswa",
  subsets: ["latin"],
  weight: "400",
});

const tanganGuru = Caveat({
  variable: "--font-tangan-guru",
  subsets: ["latin"],
  weight: ["600"],
});

const data = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
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
