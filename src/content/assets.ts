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
      url: publicAsset("dokumen/video-tutorial.mp4") ?? "https://youtube.com/@smpn27malangmbois",
      lokal: Boolean(publicAsset("dokumen/video-tutorial.mp4")),
    },
    {
      nama: "SK SINGO MBOIS SMPN 27",
      ket: "Surat keputusan penetapan tim pelaksana.",
      jenis: "PDF",
      url: publicAsset("dokumen/sk-singo-mbois.pdf") ?? `${fallback}/tim-singo-mbois`,
      lokal: Boolean(publicAsset("dokumen/sk-singo-mbois.pdf")),
    },
    {
      nama: "HAKI SINGO MBOIS",
      ket: "Sertifikat hak kekayaan intelektual SINGO MBOIS.",
      jenis: "PDF",
      url: publicAsset("dokumen/haki-singo-mbois.pdf") ?? fallback,
      lokal: Boolean(publicAsset("dokumen/haki-singo-mbois.pdf")),
    },
    {
      nama: "Profil SINGO MBOIS",
      ket: "Buku profil inovasi layanan SINGO MBOIS.",
      jenis: "PDF",
      url: publicAsset("dokumen/profil-singo-mbois.pdf") ?? fallback,
      lokal: Boolean(publicAsset("dokumen/profil-singo-mbois.pdf")),
    },
  ];
}

/** URL profil SINGO MBOIS untuk CTA hero (null bila berkasnya belum ada). */
export function profilSingoMbois(): string | null {
  return publicAsset("dokumen/profil-singo-mbois.pdf");
}

/**
 * URL video panduan untuk tombol popup di hero; tombol baru tampil kalau
 * diisi. Sengaja kosong: video sebelumnya di Vercel Blob menghabiskan kuota
 * Blob Data Transfer paket Hobby (10GB/bulan), jadi taruh di host video
 * eksternal (mis. YouTube), bukan di Blob.
 */
export function videoPanduanUrl(): string | null {
  return null;
}
