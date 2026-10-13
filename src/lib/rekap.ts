import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";
import type { RawFeatures } from "@/lib/analysis";
import { GESTALT_VERSION, interpretGestalt, type GestaltIndication } from "@/lib/gestalt";
import { summarizeKokurikulerPersonalityPattern } from "@/lib/kokurikulerPersonality";

/**
 * Rekap kesimpulan tingkat siswa, dihitung LIVE dari data yang sudah ada:
 * (a) indikasi Grafologi Gestalt tiap pengerjaan (kemiringan, ukuran, spasi) dan
 * (b) pola jawaban kokurikuler per dimensi. Tidak ada tabel baru. Semua angka
 * adalah INDIKASI AWAL mesin, bukan diagnosis; teks tiap kategori dipakai ulang
 * dari interpretGestalt supaya tidak ada dua versi kalimat yang berselisih.
 */

export const REKAP_VERSION = "rekap-v1.0";
/** Di bawah ini kesimpulan tertulis tidak dibuat (terlalu sedikit untuk disimpulkan). */
export const MIN_N_KESIMPULAN = 5;
/** Di bawah ini persentase tetap tampil, tapi diberi peringatan sampel kecil. */
export const MIN_N_YAKIN = 10;
/** Ambang "kuat" untuk dimensi kokurikuler (persentase jawaban sesuai kunci). */
export const AMBANG_KUAT = 70;

export type GVar = GestaltIndication["variable"];
const VARIABLES: GVar[] = ["kemiringan", "ukuran", "spasi"];
const VARIABLE_LABEL: Record<GVar, string> = {
  kemiringan: "Kemiringan huruf",
  ukuran: "Ukuran huruf",
  spasi: "Spasi antar kata",
};

export interface RekapFilter {
  academicYearId?: string;
  grade?: number;
  classId?: string;
  level?: "LOW" | "MIDDLE" | "HIGH";
  quizId?: string;
  validatedOnly?: boolean;
}

// ---------- katalog kategori (teks diambil dari interpretGestalt) ----------

function stubFeatures(over: { slant?: number; xHeight?: number; spacing?: number }): RawFeatures {
  const none = { value: null, unit: "", confidence: 0 };
  return {
    xHeight: over.xHeight != null ? { value: over.xHeight, unit: "mm", confidence: 1 } : { ...none, unit: "mm" },
    sizeConsistency: { ...none, unit: "%" },
    baselineDeviation: { ...none, unit: "mm" },
    wordSpacingRatio: over.spacing != null ? { value: over.spacing, unit: "x", confidence: 1 } : { ...none, unit: "x" },
    spacingConsistency: { ...none, unit: "%" },
    marginDeviation: { ...none, unit: "mm" },
    slant: over.slant != null ? { value: over.slant, unit: "deg", confidence: 1 } : { ...none, unit: "deg" },
    scratchDensity: { ...none, unit: "%" },
    componentCount: 0,
    lineBandsDetected: 0,
  };
}

interface CatalogEntry {
  category: string;
  title: string;
  description: string;
  saran: string;
}

function pick(results: ReturnType<typeof interpretGestalt>, variable: GVar): CatalogEntry {
  const r = results.find((x) => x.variable === variable);
  if (!r || !r.measured) throw new Error(`Katalog Gestalt gagal untuk ${variable}`);
  return { category: r.category, title: r.title, description: r.description, saran: r.saran };
}

/** Implikasi pembelajaran untuk guru/sekolah (kalimat ke siswa di `saran` tidak
 *  cocok untuk rekap). Usulan awal; tinjau bersama Guru BK sebelum dijadikan acuan. */
const IMPLIKASI_SEKOLAH: Record<string, string> = {
  "Miring ke kanan": "Perbanyak kegiatan belajar kelompok, presentasi, dan tutor sebaya.",
  Tegak: "Pembelajaran terstruktur (jadwal rapi, catatan terstruktur, latihan soal rutin) cocok untuk banyak siswa.",
  "Miring ke kiri": "Beri waktu membaca dan mencatat mandiri sebelum masuk diskusi kelompok.",
  "Cenderung kecil": "Manfaatkan fokus pada detail untuk tugas yang butuh ketelitian, dan selipkan jeda supaya siswa tidak lelah.",
  Sedang: "Siswa luwes memilih cara belajar; sediakan variasi metode dan biarkan siswa memilih yang paling nyaman.",
  "Cenderung besar": "Beri ruang tampil: bercerita di depan kelas, lomba, atau memimpin kelompok.",
  "Cenderung rapat": "Belajar bersama teman bisa jadi penyemangat; latih juga jarak antar kata supaya tulisan makin terbaca.",
  Seimbang: "Pertahankan keteraturan siswa; ini modal baik untuk belajar mandiri maupun kelompok.",
  "Cenderung lebar": "Sediakan suasana belajar yang tenang dan beri waktu berpikir tanpa mendesak.",
};

/** Urut tetap per variabel; kategori yang tak muncul di data tetap tampil 0%. */
const CATALOG: Record<GVar, CatalogEntry[]> = {
  kemiringan: [10, 0, -10].map((v) => pick(interpretGestalt(stubFeatures({ slant: v })), "kemiringan")),
  ukuran: [3, 5.5, 8].map((v) => pick(interpretGestalt(stubFeatures({ xHeight: v })), "ukuran")),
  spasi: [0.5, 1.0, 1.7].map((v) => pick(interpretGestalt(stubFeatures({ spacing: v })), "spasi")),
};

// ---------- tipe hasil ----------

export interface CategoryShare extends CatalogEntry {
  count: number;
  pct: number;
}
export interface VariableRecap {
  variable: GVar;
  label: string;
  measured: number;
  unmeasured: number;
  /** persen pengerjaan yang terukur untuk variabel ini (cakupan) */
  coveragePct: number;
  shares: CategoryShare[];
}
export interface GestaltRecap {
  /** pengerjaan (siswa × level, yang terbaru) dengan tulisan yang berhasil dianalisis */
  analysed: number;
  /** pengerjaan yang tidak punya analisis tulisan (mis. foto gambar / ditolak mutu) */
  withoutAnalysis: number;
  students: number;
  validated: number;
  variables: VariableRecap[];
}

export interface DimensionRecap {
  dimension: string;
  attempts: number;
  meanPct: number;
  strongPct: number;
}
export interface KokurikulerRecap {
  attempts: number;
  students: number;
  quizzes: number;
  dimensions: DimensionRecap[];
}

function classWhere(f: RekapFilter, schoolId?: string): Prisma.ClassWhereInput {
  return {
    ...(schoolId ? { schoolId } : {}),
    ...(f.academicYearId ? { academicYearId: f.academicYearId } : {}),
    ...(f.grade ? { grade: f.grade } : {}),
    ...(f.classId ? { id: f.classId } : {}),
  };
}

// ---------- Gestalt ----------

export async function computeGestaltRecap(f: RekapFilter, schoolId?: string): Promise<GestaltRecap> {
  const subs = await withRetry(() =>
    prisma.submission.findMany({
      where: {
        submittedAt: { not: null },
        session: {
          storyPromptId: { not: null },
          ...(f.level ? { level: f.level } : {}),
          class: classWhere(f, schoolId),
        },
        ...(f.validatedOnly ? { characterReading: { is: { status: "PUBLISHED" } } } : {}),
      },
      select: {
        studentId: true,
        session: { select: { level: true } },
        characterReading: { select: { status: true } },
        artifacts: {
          where: { kind: "TULISAN", featureSet: { isNot: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { featureSet: { select: { featuresJson: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    })
  );

  // Pengerjaan terbaru per (siswa, level) saja: pengulangan tidak dihitung dua kali.
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const key = `${s.studentId}:${s.session.level}`;
    if (!latest.has(key)) latest.set(key, s);
  }

  const counts: Record<GVar, number[]> = { kemiringan: [0, 0, 0], ukuran: [0, 0, 0], spasi: [0, 0, 0] };
  const measured: Record<GVar, number> = { kemiringan: 0, ukuran: 0, spasi: 0 };
  const students = new Set<string>();
  let analysed = 0;
  let withoutAnalysis = 0;
  let validated = 0;

  for (const s of latest.values()) {
    const fs = s.artifacts[0]?.featureSet;
    if (!fs) {
      withoutAnalysis++;
      continue;
    }
    analysed++;
    students.add(s.studentId);
    if (s.characterReading?.status === "PUBLISHED") validated++;
    const results = interpretGestalt(JSON.parse(fs.featuresJson) as RawFeatures);
    for (const r of results) {
      if (!r.measured) continue;
      const idx = CATALOG[r.variable].findIndex((c) => c.category === r.category);
      if (idx < 0) continue;
      counts[r.variable][idx]++;
      measured[r.variable]++;
    }
  }

  const variables: VariableRecap[] = VARIABLES.map((variable) => ({
    variable,
    label: VARIABLE_LABEL[variable],
    measured: measured[variable],
    unmeasured: analysed - measured[variable],
    coveragePct: analysed ? Math.round((measured[variable] / analysed) * 100) : 0,
    shares: CATALOG[variable].map((c, i) => ({
      ...c,
      count: counts[variable][i],
      pct: measured[variable] ? Math.round((counts[variable][i] / measured[variable]) * 100) : 0,
    })),
  }));

  return { analysed, withoutAnalysis, students: students.size, validated, variables };
}

/** Di bawah ini cakupan dianggap rendah: hasilnya belum mewakili seluruh siswa. */
export const AMBANG_CAKUPAN = 50;

/** Pernyataan kesimpulan + implikasi pembelajaran dari dominasi tiap variabel. */
export function gestaltConclusions(r: GestaltRecap): { pernyataan: string[]; implikasi: string[] } {
  const pernyataan: string[] = [];
  const implikasi: string[] = [];
  const unit = r.analysed === r.students ? "siswa" : "pengerjaan";
  for (const v of r.variables) {
    if (v.measured < MIN_N_KESIMPULAN) continue;
    const ranked = [...v.shares].sort((a, b) => b.pct - a.pct);
    const [top, second] = ranked;
    let line = `${v.label}: ${top.pct}% dari ${v.measured} ${unit} yang terukur menunjukkan indikasi "${top.title}" (${top.category.toLowerCase()})`;
    if (second && second.pct >= 20) line += `, diikuti ${second.pct}% "${second.title}"`;
    line += ".";
    if (v.coveragePct < AMBANG_CAKUPAN) {
      line += ` Catatan: hanya ${v.coveragePct}% ${unit} yang terukur untuk variabel ini, jadi belum mewakili seluruh siswa.`;
    }
    pernyataan.push(line);
    const imp = IMPLIKASI_SEKOLAH[top.category];
    if (imp && v.coveragePct >= AMBANG_CAKUPAN && !implikasi.includes(imp)) implikasi.push(imp);
  }
  return { pernyataan, implikasi };
}

// ---------- Kokurikuler ----------

export async function computeKokurikulerRecap(f: RekapFilter, schoolId?: string): Promise<KokurikulerRecap> {
  const attempts = await withRetry(() =>
    prisma.kokurikulerAttempt.findMany({
      where: {
        submittedAt: { not: null },
        quiz: {
          class: classWhere(f, schoolId),
          ...(f.quizId ? { id: f.quizId } : {}),
        },
        ...(f.validatedOnly ? { reading: { is: { status: "PUBLISHED" } } } : {}),
      },
      select: {
        studentId: true,
        quizId: true,
        answers: { select: { questionId: true, answerText: true, isCorrect: true } },
        quiz: {
          select: { questions: { select: { id: true, type: true, text: true, personalityDimension: true } } },
        },
      },
    })
  );

  const byDim = new Map<string, number[]>();
  const students = new Set<string>();
  const quizzes = new Set<string>();
  for (const a of attempts) {
    students.add(a.studentId);
    quizzes.add(a.quizId);
    const pattern = summarizeKokurikulerPersonalityPattern(a.quiz.questions, a.answers);
    for (const t of pattern.dimensionTallies) {
      if (t.total === 0) continue;
      if (!byDim.has(t.dimension)) byDim.set(t.dimension, []);
      byDim.get(t.dimension)!.push(t.pct);
    }
  }

  const dimensions: DimensionRecap[] = [...byDim.entries()]
    .map(([dimension, pcts]) => ({
      dimension,
      attempts: pcts.length,
      meanPct: Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length),
      strongPct: Math.round((pcts.filter((p) => p >= AMBANG_KUAT).length / pcts.length) * 100),
    }))
    .sort((a, b) => b.meanPct - a.meanPct);

  return { attempts: attempts.length, students: students.size, quizzes: quizzes.size, dimensions };
}

export function kokurikulerConclusions(r: KokurikulerRecap): string[] {
  const usable = r.dimensions.filter((d) => d.attempts >= MIN_N_KESIMPULAN);
  if (usable.length === 0) return [];
  const out: string[] = [];
  const strongest = usable[0];
  out.push(
    `Dimensi "${strongest.dimension}" paling menonjol: rata-rata ${strongest.meanPct}% jawaban sesuai kunci, dan ${strongest.strongPct}% siswa mencapai ${AMBANG_KUAT}% atau lebih.`
  );
  if (usable.length > 1) {
    const weakest = usable[usable.length - 1];
    out.push(
      `Dimensi "${weakest.dimension}" paling perlu penguatan: rata-rata ${weakest.meanPct}%, dan baru ${weakest.strongPct}% siswa mencapai ${AMBANG_KUAT}% atau lebih.`
    );
  }
  return out;
}

// ---------- opsi filter & perbandingan tahun ----------

export interface RekapOptions {
  years: { id: string; label: string }[];
  classes: { id: string; name: string; grade: number; academicYearId: string }[];
  quizzes: { id: string; label: string; classId: string }[];
}

export async function getRekapOptions(schoolId: string): Promise<RekapOptions> {
  const [years, classes, quizzes] = await withRetry(() =>
    Promise.all([
      prisma.academicYear.findMany({ where: { schoolId }, orderBy: { startDate: "desc" }, select: { id: true, label: true } }),
      prisma.class.findMany({
        where: { schoolId },
        orderBy: [{ grade: "asc" }, { name: "asc" }],
        select: { id: true, name: true, grade: true, academicYearId: true },
      }),
      prisma.kokurikulerQuiz.findMany({
        where: { class: { schoolId } },
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, classId: true },
      }),
    ])
  );
  return { years, classes, quizzes };
}

export interface YearRow {
  yearId: string;
  yearLabel: string;
  students: number;
  analysed: number;
  tops: { variable: GVar; label: string; title: string; pct: number; measured: number }[];
}

/** Satu baris per tahun ajaran: kategori dominan tiap variabel (untuk rekap tahunan). */
export async function computeYearTable(schoolId: string, validatedOnly: boolean): Promise<YearRow[]> {
  const options = await getRekapOptions(schoolId);
  const rows: YearRow[] = [];
  for (const y of options.years) {
    const r = await computeGestaltRecap({ academicYearId: y.id, validatedOnly }, schoolId);
    rows.push({
      yearId: y.id,
      yearLabel: y.label,
      students: r.students,
      analysed: r.analysed,
      tops: r.variables.map((v) => {
        const top = [...v.shares].sort((a, b) => b.pct - a.pct)[0];
        return { variable: v.variable, label: v.label, title: top.title, pct: top.pct, measured: v.measured };
      }),
    });
  }
  return rows;
}

// ---------- ringkasan publik (beranda) ----------

export interface PublicRecap {
  students: number;
  variables: VariableRecap[];
  version: string;
}

/** Hanya pengerjaan yang sudah divalidasi Guru BK, seluruh sekolah, tanpa rincian
 *  kelas/nama; hanya variabel dengan sampel dan cakupan memadai; null bila siswanya
 *  belum cukup (ambang MIN_N_YAKIN) atau tak ada variabel yang memenuhi syarat. */
export async function getPublicRecapSummary(): Promise<PublicRecap | null> {
  const r = await computeGestaltRecap({ validatedOnly: true });
  if (r.students < MIN_N_YAKIN) return null;
  const variables = r.variables.filter((v) => v.measured >= MIN_N_YAKIN && v.coveragePct >= AMBANG_CAKUPAN);
  if (variables.length === 0) return null;
  return { students: r.students, variables, version: GESTALT_VERSION };
}
