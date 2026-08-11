import type { RawFeatures } from "@/lib/analysis";

/**
 * Interpretasi Grafologi Teori Gestalt atas fitur terukur — versi terbuka dan
 * berambang terdokumentasi, seperti rubrik kerapian. Hanya DUA variabel yang
 * dikelola web (kemiringan huruf; ukuran & spasi). Variabel ketiga, TEKANAN
 * TULISAN, sengaja tidak diukur dari foto (tak valid: ketebalan garis
 * terkontaminasi jenis pena/kertas/cahaya) dan diuji langsung oleh Guru
 * BK/psikolog saat sesi tatap muka.
 *
 * Seluruh keluaran adalah INDIKASI AWAL berbahasa positif, bukan diagnosis;
 * validasi akhir selalu oleh manusia (Guru BK / tenaga ahli psikologi).
 */
export const GESTALT_VERSION = "gestalt-v1.0";

export interface GestaltIndication {
  variable: "kemiringan" | "ukuran" | "spasi";
  variableLabel: string;
  category: string; // mis. "Miring ke kanan"
  title: string; // judul indikasi positif
  description: string; // penjelasan untuk siswa, framing potensi
  saran: string; // saran cara belajar yang memanfaatkan potensi itu
  rawValue: number;
  unit: string;
  measured: true;
}

export interface GestaltUnmeasured {
  variable: "kemiringan" | "ukuran" | "spasi";
  variableLabel: string;
  measured: false;
  reason: string;
}

export type GestaltResult = GestaltIndication | GestaltUnmeasured;

export const TEKANAN_INFO =
  "Variabel ketiga, tekanan tulisan (energi vital, intensitas emosi, keteguhan hati, respons terhadap beban akademis), diuji langsung oleh Guru BK atau tenaga ahli psikologi saat sesi tatap muka, bukan dari foto.";

export const GESTALT_DISCLAIMER =
  "Ini indikasi awal dari analisis otomatis, bukan diagnosis. Hasil akhirnya divalidasi Guru BK atau tenaga ahli di bidang psikologi.";

// ---------- ambang, terdokumentasi ----------
// Kemiringan: |sudut| <= 4° dianggap tegak; di luar itu mengikuti arah dominan.
const SLANT_UPRIGHT_DEG = 4;
// Ukuran (x-height): < 4mm kecil, > 7mm besar — mengacu tinggi zona tengah
// tulisan siswa SMP pada buku bergaris 8mm.
const SIZE_SMALL_MM = 4;
const SIZE_LARGE_MM = 7;
// Spasi antar kata sebagai kelipatan x-height: < 0.7 rapat, > 1.4 lebar.
const SPACING_TIGHT = 0.7;
const SPACING_WIDE = 1.4;

export function interpretGestalt(features: RawFeatures): GestaltResult[] {
  const results: GestaltResult[] = [];

  // ---------- kemiringan huruf ----------
  const slant = features.slant;
  if (slant.value === null) {
    results.push({
      variable: "kemiringan",
      variableLabel: "Kemiringan huruf",
      measured: false,
      reason: "Arah goresan pada foto ini belum cukup konsisten untuk diukur.",
    });
  } else if (slant.value >= SLANT_UPRIGHT_DEG) {
    results.push({
      variable: "kemiringan",
      variableLabel: "Kemiringan huruf",
      category: "Miring ke kanan",
      title: "Terbuka pada orang lain",
      description:
        "Tulisan yang condong ke kanan sering muncul pada siswa yang hangat, ekspresif, dan nyaman bekerja bersama teman.",
      saran: "Belajar kelompok, presentasi, dan tutor sebaya kemungkinan besar cocok untukmu.",
      rawValue: slant.value,
      unit: "°",
      measured: true,
    });
  } else if (slant.value <= -SLANT_UPRIGHT_DEG) {
    results.push({
      variable: "kemiringan",
      variableLabel: "Kemiringan huruf",
      category: "Miring ke kiri",
      title: "Reflektif dan mandiri",
      description:
        "Tulisan yang condong ke kiri sering muncul pada siswa yang nyaman mengolah pikiran sendiri dulu sebelum berbagi. Butuh waktu tenang sebelum ikut ramai.",
      saran: "Beri dirimu waktu membaca dan mencatat sendiri dulu sebelum masuk diskusi kelompok.",
      rawValue: slant.value,
      unit: "°",
      measured: true,
    });
  } else {
    results.push({
      variable: "kemiringan",
      variableLabel: "Kemiringan huruf",
      category: "Tegak",
      title: "Kepala dingin dan stabil",
      description:
        "Tulisan tegak menandakan siswa yang menimbang dengan tenang dan tidak mudah terbawa suasana. Kontrol emosinya cenderung stabil.",
      saran: "Jadwal rapi, catatan terstruktur, dan latihan soal rutin adalah kekuatanmu.",
      rawValue: slant.value,
      unit: "°",
      measured: true,
    });
  }

  // ---------- ukuran huruf ----------
  const size = features.xHeight;
  if (size.value === null || size.unit !== "mm") {
    results.push({
      variable: "ukuran",
      variableLabel: "Ukuran huruf",
      measured: false,
      reason:
        size.unit === "px"
          ? "Ukuran belum bisa dibaca dalam milimeter karena garis lembar kerja tidak terdeteksi di foto."
          : "Ukuran huruf belum dapat diukur dari foto ini.",
    });
  } else if (size.value < SIZE_SMALL_MM) {
    results.push({
      variable: "ukuran",
      variableLabel: "Ukuran huruf",
      category: "Cenderung kecil",
      title: "Konsentrasi yang dalam",
      description:
        "Huruf berukuran kecil sering muncul pada siswa dengan konsentrasi tinggi dan perhatian kuat pada detail.",
      saran: "Manfaatkan fokus itu untuk tugas yang butuh ketelitian; ingat juga beri jeda supaya tidak lelah.",
      rawValue: size.value,
      unit: "mm",
      measured: true,
    });
  } else if (size.value > SIZE_LARGE_MM) {
    results.push({
      variable: "ukuran",
      variableLabel: "Ukuran huruf",
      category: "Cenderung besar",
      title: "Percaya diri untuk tampil",
      description:
        "Huruf berukuran besar sering muncul pada siswa yang ekspresif dan ingin karyanya terlihat. Ada energi untuk menunjukkan diri.",
      saran: "Salurkan lewat kegiatan tampil: bercerita di depan kelas, lomba, atau memimpin kelompok.",
      rawValue: size.value,
      unit: "mm",
      measured: true,
    });
  } else {
    results.push({
      variable: "ukuran",
      variableLabel: "Ukuran huruf",
      category: "Sedang",
      title: "Seimbang dan luwes",
      description:
        "Ukuran huruf yang sedang menandakan keseimbangan: bisa fokus pada detail, bisa juga melihat gambaran besar.",
      saran: "Kamu cukup luwes memilih cara belajar; coba beberapa metode dan pertahankan yang paling nyaman.",
      rawValue: size.value,
      unit: "mm",
      measured: true,
    });
  }

  // ---------- spasi antar kata ----------
  const spacing = features.wordSpacingRatio;
  if (spacing.value === null) {
    results.push({
      variable: "spasi",
      variableLabel: "Spasi antar kata",
      measured: false,
      reason: "Jarak antar kata belum dapat diukur dari foto ini.",
    });
  } else if (spacing.value > SPACING_WIDE) {
    results.push({
      variable: "spasi",
      variableLabel: "Spasi antar kata",
      category: "Cenderung lebar",
      title: "Butuh ruang untuk berpikir",
      description:
        "Jarak antar kata yang lebar sering muncul pada siswa yang mandiri dan menyukai ruang pribadi saat berpikir.",
      saran: "Sediakan tempat belajar yang tenang milikmu sendiri; hasilmu justru bagus saat tidak terburu-buru.",
      rawValue: spacing.value,
      unit: "× tinggi huruf",
      measured: true,
    });
  } else if (spacing.value < SPACING_TIGHT) {
    results.push({
      variable: "spasi",
      variableLabel: "Spasi antar kata",
      category: "Cenderung rapat",
      title: "Dekat dengan orang sekitar",
      description:
        "Jarak antar kata yang rapat sering muncul pada siswa yang senang berada dekat orang lain dan nyaman dalam kebersamaan.",
      saran: "Belajar bersama teman bisa jadi penyemangat; latih juga memberi jarak antar kata supaya tulisan makin terbaca.",
      rawValue: spacing.value,
      unit: "× tinggi huruf",
      measured: true,
    });
  } else {
    results.push({
      variable: "spasi",
      variableLabel: "Spasi antar kata",
      category: "Seimbang",
      title: "Menata ruang dengan baik",
      description:
        "Jarak antar kata yang seimbang menandakan kamu cukup baik menata ruang, baik di kertas maupun dalam mengatur waktu dan pergaulan.",
      saran: "Pertahankan; keteraturan ini modal bagus untuk belajar mandiri maupun kelompok.",
      rawValue: spacing.value,
      unit: "× tinggi huruf",
      measured: true,
    });
  }

  return results;
}
