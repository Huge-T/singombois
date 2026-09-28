import type { DimensionTally } from "@/lib/kokurikulerPersonality";

/**
 * Kesimpulan otomatis per tema kokurikuler untuk membantu wali kelas mengisi
 * rapot — beda dari summarizeKokurikulerPersonalityPattern (yang cuma tally
 * mekanis tanpa kalimat), ini merangkai kalimat siap pakai dari bank kalimat
 * per dimensi. Hanya tersedia untuk tema yang sudah didaftarkan di bawah;
 * tema lain (atau tanpa tema) tidak menghasilkan kesimpulan sama sekali,
 * bukan menebak-nebak kalimat generik.
 */

// Ambang batas "tercapai": >= ini dianggap mampu, deskripsi dimensinya
// masuk kesimpulan. Di bawah ini dianggap "jelek", dimensinya dilewati dan
// siswa perlu mengulang kuis untuk memperbaiki dimensi itu.
const ACHIEVED_THRESHOLD_PCT = 70;

// Kunci tema dicocokkan case-insensitive & trim, supaya "GEMATI"/"gemati "
// dari input guru yang bebas ketik tetap kena.
const CONCLUSION_SENTENCES: Record<string, Record<string, string>> = {
  gemati: {
    Kemandirian: "Ananda mampu menunjukkan kemandirian dalam memahami dan menyelesaikan permasalahan dengan baik.",
    Kreativitas: "Ananda mampu mengembangkan gagasan dan memaknai berbagai situasi secara kreatif dengan baik.",
    Kewargaan:
      "Ananda mampu memahami dan menunjukkan nilai-nilai kewargaan serta kepedulian terhadap kehidupan bersama dengan baik.",
    "Penalaran Kritis": "Ananda mampu menganalisis informasi dan permasalahan secara kritis dan objektif dengan baik.",
  },
};

export interface KokurikulerConclusionResult {
  tema: string;
  text: string; // kosong bila tidak ada dimensi yang tercapai
  achievedDimensions: string[];
  weakDimensions: string[]; // di bawah ambang, deskripsinya sengaja tidak dimasukkan
  showRetryOption: boolean; // true kalau ada minimal satu dimensi di bawah ambang
  // Skor gabungan (bahan nilai rapot) — hanya terisi kalau SEMUA dimensi yang
  // dilacak sudah >= ambang DAN nilai esai sudah dinilai guru. Rumus: rata-rata
  // persentase seluruh dimensi, dirata-rata lagi dengan nilai esai.
  combinedScore: number | null;
}

/** null kalau tema tidak dikenali (belum ada bank kalimatnya) — fitur ini
 *  tidak menampilkan apa pun untuk tema di luar daftar, alih-alih menebak. */
export function generateKokurikulerConclusion(
  tema: string | null | undefined,
  dimensionTallies: DimensionTally[],
  essayScore: number | null
): KokurikulerConclusionResult | null {
  if (!tema) return null;
  const bank = CONCLUSION_SENTENCES[tema.trim().toLowerCase()];
  if (!bank) return null;

  const achievedDimensions: string[] = [];
  const weakDimensions: string[] = [];
  const sentences: string[] = [];
  const trackedPct: number[] = [];

  for (const t of dimensionTallies) {
    if (!(t.dimension in bank)) continue; // dimensi di luar bank kalimat tema ini, lewati
    trackedPct.push(t.pct);
    if (t.pct >= ACHIEVED_THRESHOLD_PCT) {
      achievedDimensions.push(t.dimension);
      sentences.push(bank[t.dimension]);
    } else {
      weakDimensions.push(t.dimension);
    }
  }

  const allAchieved = trackedPct.length > 0 && weakDimensions.length === 0;
  const dimensionAveragePct = trackedPct.length > 0 ? trackedPct.reduce((a, b) => a + b, 0) / trackedPct.length : 0;
  const combinedScore =
    allAchieved && essayScore !== null ? Math.round(((dimensionAveragePct + essayScore) / 2) * 10) / 10 : null;

  return {
    tema,
    text: sentences.join(" "),
    achievedDimensions,
    weakDimensions,
    showRetryOption: weakDimensions.length > 0,
    combinedScore,
  };
}
