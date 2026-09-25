import Papa from "papaparse";
import type { KokurikulerQuestionType } from "@prisma/client";

/**
 * Template CSV soal kokurikuler: kolom tetap, satu baris = satu soal.
 * PILIHAN_GANDA butuh minimal 2 opsi terisi + kunci A-D yang opsinya terisi.
 * BENAR_SALAH butuh kunci BENAR/SALAH. URAIAN tidak divalidasi kuncinya
 * (tidak ada penilaian otomatis untuk esai).
 */
export const KOKURIKULER_CSV_COLUMNS = [
  "tipe_soal",
  "teks_soal",
  "opsi_a",
  "opsi_b",
  "opsi_c",
  "opsi_d",
  "kunci_jawaban",
  "dimensi_kepribadian",
] as const;

export const KOKURIKULER_CSV_TEMPLATE_ROWS: Record<(typeof KOKURIKULER_CSV_COLUMNS)[number], string>[] = [
  {
    tipe_soal: "PILIHAN_GANDA",
    teks_soal: "Apa sikap yang tepat saat teman kesulitan mengerjakan tugas?",
    opsi_a: "Mengabaikan",
    opsi_b: "Membantu semampunya",
    opsi_c: "Menertawakan",
    opsi_d: "Pura-pura tidak melihat",
    kunci_jawaban: "B",
    dimensi_kepribadian: "empati",
  },
  {
    tipe_soal: "BENAR_SALAH",
    teks_soal: "Bekerja sama membuat tugas kelompok lebih cepat selesai.",
    opsi_a: "",
    opsi_b: "",
    opsi_c: "",
    opsi_d: "",
    kunci_jawaban: "BENAR",
    dimensi_kepribadian: "kepemimpinan",
  },
  {
    tipe_soal: "URAIAN",
    teks_soal: "Ceritakan pengalamanmu saat menghadapi tugas yang terasa sangat sulit.",
    opsi_a: "",
    opsi_b: "",
    opsi_c: "",
    opsi_d: "",
    kunci_jawaban: "",
    dimensi_kepribadian: "ketangguhan",
  },
];

export function buildKokurikulerCsvTemplate(): string {
  return Papa.unparse({
    fields: [...KOKURIKULER_CSV_COLUMNS],
    data: KOKURIKULER_CSV_TEMPLATE_ROWS.map((row) => KOKURIKULER_CSV_COLUMNS.map((col) => row[col])),
  });
}

export interface ParsedQuestionRow {
  rowNumber: number; // 1-based, dihitung dari baris data pertama (baris ke-2 di spreadsheet termasuk header)
  type: KokurikulerQuestionType;
  text: string;
  options: string[] | null; // PILIHAN_GANDA saja, entri terisi berurutan
  correctAnswer: string | null;
  personalityDimension: string | null;
}

export interface CsvRowError {
  rowNumber: number;
  message: string;
}

export interface ParseKokurikulerCsvResult {
  rows: ParsedQuestionRow[];
  errors: CsvRowError[];
}

const OPTION_KEYS = ["opsi_a", "opsi_b", "opsi_c", "opsi_d"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D"];

// Guru menulis dengan bahasa wajar ("Pilihan Ganda", "Benar-Salah", "Esai"),
// bukan persis nama enum ("PILIHAN_GANDA") — terima variasi umum ini selain
// bentuk baku. slugify menyamakan spasi/tanda pisah jadi satu format sebelum
// dicocokkan, supaya "Tipe Soal", "tipe-soal", dst juga cocok ke "tipe_soal".
function slugify(s: string): string {
  return s.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const TYPE_ALIASES: Record<string, KokurikulerQuestionType> = {
  PILIHAN_GANDA: "PILIHAN_GANDA",
  PG: "PILIHAN_GANDA",
  BENAR_SALAH: "BENAR_SALAH",
  BS: "BENAR_SALAH",
  B_S: "BENAR_SALAH",
  URAIAN: "URAIAN",
  ESAI: "URAIAN",
  ESSAY: "URAIAN",
};

// Sebagian guru menaruh semua pilihan dalam SATU kolom (mis. "Opsi Soal")
// alih-alih 4 kolom terpisah opsi_a..d, dengan tiap baris diawali "A."/"B."/
// dst. Dipakai sebagai fallback kalau opsi_a..d kosong/kurang dari 2 terisi —
// hanya memecah teks yang SUDAH diberi label huruf, tidak menebak apa pun.
const MERGED_OPTIONS_COLUMNS = ["opsi_soal", "opsi", "opsi_jawaban", "pilihan_jawaban"];

function parseMergedOptions(raw: Record<string, string>): string[] {
  for (const col of MERGED_OPTIONS_COLUMNS) {
    const value = raw[col];
    if (!value || !value.trim()) continue;
    const options = ["", "", "", ""];
    for (const line of value.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-D])[.)\-]\s*(.+)$/i);
      if (m) {
        const idx = OPTION_LETTERS.indexOf(m[1].toUpperCase());
        if (idx !== -1) options[idx] = m[2].trim();
      }
    }
    if (options.filter((o) => o.length > 0).length >= 2) return options;
  }
  return ["", "", "", ""];
}

export function parseKokurikulerQuestionsCsv(csvText: string): ParseKokurikulerCsvResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    // "Tipe Soal"/"tipe-soal" dsb juga harus cocok ke kunci "tipe_soal".
    transformHeader: (h) => slugify(h).toLowerCase(),
  });

  const errors: CsvRowError[] = [];
  const rows: ParsedQuestionRow[] = [];

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 1;
    const type = TYPE_ALIASES[slugify(raw.tipe_soal ?? "")];
    if (!type) {
      errors.push({
        rowNumber,
        message: "Tipe soal tidak dikenali (isi PILIHAN_GANDA/BENAR_SALAH/URAIAN)",
      });
      return;
    }

    const text = (raw.teks_soal ?? "").trim();
    if (!text) {
      errors.push({ rowNumber, message: "Teks soal kosong" });
      return;
    }

    const dimensiRaw = (raw.dimensi_kepribadian ?? "").trim();
    const personalityDimension = dimensiRaw || null;

    if (type === "PILIHAN_GANDA") {
      let options = OPTION_KEYS.map((key) => (raw[key] ?? "").trim());
      if (options.filter((o) => o.length > 0).length < 2) {
        options = parseMergedOptions(raw);
      }
      const filledCount = options.filter((o) => o.length > 0).length;
      if (filledCount < 2) {
        errors.push({ rowNumber, message: "Soal pilihan ganda butuh minimal 2 opsi terisi" });
        return;
      }
      const kunciRaw = (raw.kunci_jawaban ?? "").trim();
      const kunci = kunciRaw.toUpperCase();
      const kunciIndex = OPTION_LETTERS.indexOf(kunci);
      if (kunciIndex === -1 || !options[kunciIndex]) {
        const looksMerged = kunciRaw.includes("\n");
        errors.push({
          rowNumber,
          message: looksMerged
            ? "Kunci jawaban berisi lebih dari satu baris — isi cuma satu huruf A/B/C/D yang benar, jangan tempel teks pilihan lengkap"
            : "Kunci jawaban harus A/B/C/D dan opsinya harus terisi",
        });
        return;
      }
      rows.push({
        rowNumber,
        type,
        text,
        options: options.filter((o) => o.length > 0),
        correctAnswer: kunci,
        personalityDimension,
      });
      return;
    }

    if (type === "BENAR_SALAH") {
      const kunci = (raw.kunci_jawaban ?? "").trim().toUpperCase();
      if (kunci !== "BENAR" && kunci !== "SALAH") {
        errors.push({ rowNumber, message: "Kunci jawaban harus BENAR atau SALAH" });
        return;
      }
      rows.push({ rowNumber, type, text, options: null, correctAnswer: kunci, personalityDimension });
      return;
    }

    // URAIAN: tidak ada kunci otomatis, isi kunci_jawaban (bila ada) diabaikan.
    rows.push({ rowNumber, type, text, options: null, correctAnswer: null, personalityDimension });
  });

  return { rows, errors };
}
