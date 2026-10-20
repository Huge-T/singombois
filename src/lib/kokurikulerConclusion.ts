import type { DimensionTally } from "@/lib/kokurikulerPersonality";

/**
 * Kesimpulan otomatis per kuis kokurikuler untuk membantu wali kelas mengisi
 * rapot — beda dari summarizeKokurikulerPersonalityPattern (yang cuma tally
 * mekanis tanpa kalimat), ini merangkai kalimat siap pakai per dimensi.
 * Urutan pencarian kalimat: bank khusus tema (bila ada) → bank dimensi umum
 * (delapan dimensi profil lulusan) → kalimat generik berbasis nama dimensi.
 * Jadi kuis tema apa pun tetap mendapat kesimpulan selama soalnya bertag dimensi.
 */

// Ambang batas "tercapai": >= ini dianggap mampu, deskripsi dimensinya
// masuk kesimpulan. Di bawah ini dianggap "jelek", dimensinya dilewati dan
// siswa perlu mengulang kuis untuk memperbaiki dimensi itu.
export const ACHIEVED_THRESHOLD_PCT = 70;

// Kunci tema dicocokkan case-insensitive & trim, supaya "GEMATI"/"gemati "
// dari input guru yang bebas ketik tetap kena.
const THEME_SENTENCES: Record<string, Record<string, string>> = {
  gemati: {
    Kemandirian: "Ananda mampu menunjukkan kemandirian dalam memahami dan menyelesaikan permasalahan dengan baik.",
    Kreativitas: "Ananda mampu mengembangkan gagasan dan memaknai berbagai situasi secara kreatif dengan baik.",
    Kewargaan:
      "Ananda mampu memahami dan menunjukkan nilai-nilai kewargaan serta kepedulian terhadap kehidupan bersama dengan baik.",
    "Penalaran Kritis": "Ananda mampu menganalisis informasi dan permasalahan secara kritis dan objektif dengan baik.",
  },
};

// Bank dimensi umum (dimensi profil lulusan), dicocokkan lewat awalan nama
// dimensi (huruf kecil) supaya "Keimanan dan Ketakwaan" / "Keimanan dan
// Ketakwaan terhadap Tuhan YME" sama-sama kena.
const DIMENSION_SENTENCES: [prefix: string, sentence: string][] = [
  ["keimanan", "Ananda mampu menunjukkan keimanan dan ketakwaan kepada Tuhan Yang Maha Esa dalam sikap dan perilaku sehari-hari dengan baik."],
  ["kewargaan", "Ananda mampu memahami dan menunjukkan nilai-nilai kewargaan serta kepedulian terhadap kehidupan bersama dengan baik."],
  ["penalaran", "Ananda mampu menganalisis informasi dan permasalahan secara kritis dan objektif dengan baik."],
  ["kreativitas", "Ananda mampu mengembangkan gagasan dan memaknai berbagai situasi secara kreatif dengan baik."],
  ["kolaborasi", "Ananda mampu bekerja sama dengan orang lain untuk mencapai tujuan bersama dengan baik."],
  ["kemandirian", "Ananda mampu menunjukkan kemandirian dalam memahami dan menyelesaikan permasalahan dengan baik."],
  ["kesehatan", "Ananda mampu menunjukkan kesadaran untuk menjaga kesehatan fisik dan mentalnya dengan baik."],
  ["komunikasi", "Ananda mampu menyampaikan dan memahami gagasan dalam berbagai situasi dengan baik."],
];

function sentenceFor(tema: string | null | undefined, dimension: string): string {
  const themed = tema ? THEME_SENTENCES[tema.trim().toLowerCase()] : undefined;
  if (themed && dimension in themed) return themed[dimension];
  const key = dimension.trim().toLowerCase();
  const general = DIMENSION_SENTENCES.find(([prefix]) => key.startsWith(prefix));
  if (general) return general[1];
  return `Ananda menunjukkan capaian yang baik pada dimensi ${dimension.trim()}.`;
}

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

/** null hanya bila kuis tidak punya soal bertag dimensi (tidak ada yang bisa disimpulkan). */
export function generateKokurikulerConclusion(
  tema: string | null | undefined,
  dimensionTallies: DimensionTally[],
  essayScore: number | null
): KokurikulerConclusionResult | null {
  const tracked = dimensionTallies.filter((t) => t.total > 0);
  if (tracked.length === 0) return null;

  const achievedDimensions: string[] = [];
  const weakDimensions: string[] = [];
  const sentences: string[] = [];
  const trackedPct: number[] = [];

  for (const t of tracked) {
    trackedPct.push(t.pct);
    if (t.pct >= ACHIEVED_THRESHOLD_PCT) {
      achievedDimensions.push(t.dimension);
      sentences.push(sentenceFor(tema, t.dimension));
    } else {
      weakDimensions.push(t.dimension);
    }
  }

  const allAchieved = weakDimensions.length === 0;
  const dimensionAveragePct = trackedPct.reduce((a, b) => a + b, 0) / trackedPct.length;
  const combinedScore =
    allAchieved && essayScore !== null ? Math.round(((dimensionAveragePct + essayScore) / 2) * 10) / 10 : null;

  return {
    tema: tema ?? "",
    text: sentences.join(" "),
    achievedDimensions,
    weakDimensions,
    showRetryOption: weakDimensions.length > 0,
    combinedScore,
  };
}
