import assetManifest from "./asset-manifest.json";

/**
 * Kontrak aset yang diunggah tim (lihat ASSETS.md). Semua helper di file ini
 * berjalan di server component: cek keberadaan file di public/ lewat manifest
 * yang dihasilkan saat build (scripts/gen-asset-manifest.mjs — existsSync
 * tidak andal di serverless), kembalikan URL publiknya bila ada, atau null
 * bila belum diunggah sehingga halaman bisa menampilkan placeholder yang rapi
 * alih-alih gambar rusak.
 */
const publicFiles = new Set<string>(assetManifest);

function publicAsset(relPath: string): string | null {
  const clean = relPath.replace(/\\/g, "/");
  return publicFiles.has(clean) ? `/${clean}` : null;
}

/** URL publik untuk aset apa pun bila filenya sudah diunggah, atau null. */
export function assetUrl(relPath: string): string | null {
  return publicAsset(relPath);
}

export function logoSingoMbois() {
  return publicAsset("logo/singo-mbois.png");
}

export function logoSmpn27() {
  return publicAsset("logo/smpn27.png");
}

/** Dokumen resmi. Bila file lokal belum ada, fallback ke Google Sites lama. */
export function dokumen() {
  const fallback = "https://sites.google.com/view/singombois";
  return [
    {
      nama: "Buku Pedoman Teknis SINGO MBOIS",
      ket: "Langkah pelaksanaan tes, pembacaan hasil, sampai tindak lanjut.",
      jenis: "PDF",
      url: publicAsset("dokumen/buku-panduan-teknis.pdf") ?? fallback,
      lokal: Boolean(publicAsset("dokumen/buku-panduan-teknis.pdf")),
    },
    {
      nama: "Video Tutorial Layanan Online",
      ket: "Panduan memakai layanan SINGO MBOIS secara daring.",
      jenis: "VIDEO",
      url: publicAsset("dokumen/video-tutorial.mp4") ?? fallback,
      lokal: Boolean(publicAsset("dokumen/video-tutorial.mp4")),
    },
    {
      nama: "SK SINGO MBOIS SMPN 27",
      ket: "Surat keputusan penetapan tim pelaksana.",
      jenis: "PDF",
      url: publicAsset("dokumen/sk-singo-mbois.pdf") ?? `${fallback}/tim-singo-mbois`,
      lokal: Boolean(publicAsset("dokumen/sk-singo-mbois.pdf")),
    },
  ];
}

/** Kartu giat + slot fotonya (foto muncul otomatis begitu file diunggah). */
export function giatCards() {
  const items = [
    { slug: "sosialisasi", label: "sosialisasi", judul: "Sosialisasi SINGO MBOIS kepada siswa" },
    { slug: "tes-awal", label: "tes awal", judul: "Tes awal kegiatan SINGO MBOIS" },
    { slug: "pendampingan-tes-awal", label: "tes awal", judul: "Pendampingan tes awal SINGO MBOIS" },
    { slug: "menyimak", label: "literasi", judul: "Kegiatan menyimak literasi" },
    { slug: "literasi-vii-c", label: "literasi", judul: "Kegiatan literasi kelas VII-C" },
    { slug: "literasi-ix-c", label: "literasi", judul: "Kegiatan literasi kelas IX-C" },
  ];
  return items.map((it) => ({
    ...it,
    foto: publicAsset(`foto/giat/${it.slug}.jpg`) ?? publicAsset(`foto/giat/${it.slug}.png`),
  }));
}
