/**
 * The 15 literacy indicators from the published journal (Lampiran A), plus the
 * feature/module that addresses each in the product. These are the fixed
 * baseline reference numbers from the 2026 study (n=288) — not something the
 * app computes, so they're kept as a single source of truth here.
 */
export const BASELINE_INDICATORS = [
  { code: "reading_comprehension", label: "Membaca lembar kerja", value: 78, feature: "Tampilan baca (SES-3)" },
  { code: "text_understanding", label: "Memahami teks", value: 77, feature: "Soal pemahaman + skor Membaca" },
  { code: "careful_reading", label: "Membaca dengan cermat", value: 78, feature: "Telemetri waktu baca" },
  { code: "listening", label: "Menyimak audio", value: 70, feature: "Standar kualitas audio (AUD-1..6)" },
  { code: "audio_understanding", label: "Memahami audio", value: 74, feature: "Soal pemahaman audio" },
  { code: "listening_focus", label: "Fokus menyimak", value: 78, feature: "Batas pengulangan audio" },
  { code: "worksheet_completion", label: "Menyelesaikan lembar kerja", value: 78, feature: "Alur sesi terkunci" },
  { code: "clear_writing", label: "Menulis jawaban dengan jelas", value: 77, feature: "Skor keterbacaan" },
  { code: "idea_expression", label: "Menuangkan ide ke tulisan", value: 76, feature: "Penilaian isi oleh guru" },
  { code: "handwriting_neatness", label: "Kerapian tulisan tangan", value: 67, feature: "Skor kerapian + modul latihan" },
  { code: "speaking_confidence", label: "Keberanian berpendapat", value: 72, feature: "Umpan balik bahasa positif" },
  { code: "letterform_attention", label: "Perhatian pada bentuk huruf", value: 74, feature: "Fitur konsistensi bentuk" },
  { code: "learning_support", label: "Membantu belajar", value: 78, feature: "Fokus latihan personal" },
  { code: "motivation", label: "Menambah semangat", value: 76, feature: "Progres visual" },
  { code: "overall_literacy", label: "Meningkatkan literasi", value: 79, feature: "Rapor tren lintas semester" },
] as const;

export const PROGRAM_EFFECTIVENESS = 76;
export const STUDY_SAMPLE_N = 288;
