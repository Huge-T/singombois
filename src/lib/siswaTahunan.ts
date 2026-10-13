import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";
import type { RawFeatures } from "@/lib/analysis";
import { interpretGestalt, type GestaltResult } from "@/lib/gestalt";
import { summarizeKokurikulerPersonalityPattern, type DimensionTally } from "@/lib/kokurikulerPersonality";
import { generateKokurikulerConclusion } from "@/lib/kokurikulerConclusion";

/**
 * Rekap SATU siswa untuk SATU tahun ajaran: bahan Guru BK menulis kesimpulan
 * tahunan, dan dasar draf otomatis. Dihitung live dari data yang ada (tidak ada
 * tabel baru selain FinalConclusion per tahun). Tahun sebuah pengerjaan
 * ditentukan oleh kelas sesi/kuisnya, bukan kelas siswa saat ini, jadi riwayat
 * tetap benar walau siswa sudah naik kelas.
 */

export const LEVELS = ["LOW", "MIDDLE", "HIGH"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { LOW: "Level 1", MIDDLE: "Level 2", HIGH: "Level 3" };

export interface StrengthItem {
  title: string;
  detail: string;
}

export interface LevelRecap {
  level: Level;
  label: string;
  state: "BELUM" | "MENUNGGU" | "TERVALIDASI";
  gestalt: GestaltResult[] | null;
  strengths: StrengthItem[];
  learningSuggestions: string | null;
}

export interface KokurikulerYear {
  quizLabel: string;
  tema: string | null;
  finalScore: number | null;
  dimensions: DimensionTally[];
  /** Kalimat kesimpulan per dimensi yang tercapai (bank kalimat tema, sama dengan kartu "bahan input rapot"); kosong bila tema tak dikenal. */
  conclusionText: string;
  weakDimensions: string[];
}

export interface LiterasiRow {
  sessionLabel: string;
  reading: number | null;
  listening: number | null;
  writingContent: number | null;
  writingQuality: number | null;
}

export interface StudentYearRecap {
  yearId: string;
  yearLabel: string;
  levels: LevelRecap[];
  validatedLevels: Level[];
  kokurikuler: KokurikulerYear[];
  literasi: LiterasiRow[];
}

/** Level yang sudah divalidasi (pembacaan Guru BK terbit) di tahun ajaran itu. */
export async function validatedLevelsInYear(studentId: string, academicYearId: string): Promise<Set<Level>> {
  const rows = await withRetry(() =>
    prisma.submission.findMany({
      where: {
        studentId,
        session: { storyPromptId: { not: null }, class: { academicYearId } },
        characterReading: { is: { status: "PUBLISHED" } },
      },
      select: { session: { select: { level: true } } },
    })
  );
  return new Set(rows.map((r) => r.session.level as Level));
}

/** Tahun ajaran yang relevan untuk siswa: kelas sekarang + tempat ia punya pengerjaan/kesimpulan. */
export async function getStudentYears(studentId: string): Promise<{ id: string; label: string }[]> {
  const [student, subs, attempts, conclusions] = await withRetry(() =>
    Promise.all([
      prisma.student.findUnique({ where: { id: studentId }, select: { class: { select: { academicYearId: true } } } }),
      prisma.submission.findMany({
        where: { studentId },
        select: { session: { select: { class: { select: { academicYearId: true } } } } },
      }),
      prisma.kokurikulerAttempt.findMany({
        where: { studentId },
        select: { quiz: { select: { class: { select: { academicYearId: true } } } } },
      }),
      prisma.finalConclusion.findMany({ where: { studentId }, select: { academicYearId: true } }),
    ])
  );
  const ids = new Set<string>();
  if (student) ids.add(student.class.academicYearId);
  for (const s of subs) ids.add(s.session.class.academicYearId);
  for (const a of attempts) ids.add(a.quiz.class.academicYearId);
  for (const c of conclusions) ids.add(c.academicYearId);
  return withRetry(() =>
    prisma.academicYear.findMany({
      where: { id: { in: [...ids] } },
      orderBy: { startDate: "desc" },
      select: { id: true, label: true },
    })
  );
}

export async function getStudentYearRecap(studentId: string, academicYearId: string): Promise<StudentYearRecap | null> {
  const year = await withRetry(() => prisma.academicYear.findUnique({ where: { id: academicYearId } }));
  if (!year) return null;

  const [gestaltSubs, literasiSubs, attempts] = await withRetry(() =>
    Promise.all([
      prisma.submission.findMany({
        where: {
          studentId,
          submittedAt: { not: null },
          session: { storyPromptId: { not: null }, class: { academicYearId } },
        },
        orderBy: { submittedAt: "desc" },
        select: {
          session: { select: { level: true } },
          characterReading: { select: { status: true, strengthsJson: true, learningSuggestions: true } },
          artifacts: {
            where: { kind: "TULISAN", featureSet: { isNot: null } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { featureSet: { select: { featuresJson: true } } },
          },
        },
      }),
      prisma.submission.findMany({
        where: { studentId, submittedAt: { not: null }, session: { class: { academicYearId } } },
        orderBy: { submittedAt: "asc" },
        select: {
          session: { select: { label: true } },
          scores: { orderBy: { createdAt: "desc" }, take: 1, select: { reading: true, listening: true, writingContent: true, writingQuality: true } },
        },
      }),
      prisma.kokurikulerAttempt.findMany({
        where: { studentId, submittedAt: { not: null }, quiz: { class: { academicYearId } } },
        orderBy: { submittedAt: "asc" },
        select: {
          finalScore: true,
          essayScore: true,
          answers: { select: { questionId: true, answerText: true, isCorrect: true } },
          quiz: {
            select: {
              label: true,
              tema: true,
              questions: { select: { id: true, type: true, text: true, personalityDimension: true } },
            },
          },
        },
      }),
    ])
  );

  const levels: LevelRecap[] = LEVELS.map((level) => {
    const sub = gestaltSubs.find((s) => s.session.level === level); // terbaru per level
    const fs = sub?.artifacts[0]?.featureSet;
    const reading = sub?.characterReading;
    const validated = reading?.status === "PUBLISHED";
    return {
      level,
      label: LEVEL_LABEL[level],
      state: validated ? "TERVALIDASI" : sub ? "MENUNGGU" : "BELUM",
      gestalt: fs ? interpretGestalt(JSON.parse(fs.featuresJson) as RawFeatures) : null,
      strengths: reading ? (JSON.parse(reading.strengthsJson) as StrengthItem[]) : [],
      learningSuggestions: reading?.learningSuggestions ?? null,
    };
  });

  return {
    yearId: year.id,
    yearLabel: year.label,
    levels,
    validatedLevels: levels.filter((l) => l.state === "TERVALIDASI").map((l) => l.level),
    kokurikuler: attempts.map((a) => {
      const dimensions = summarizeKokurikulerPersonalityPattern(a.quiz.questions, a.answers).dimensionTallies;
      const kes = generateKokurikulerConclusion(a.quiz.tema, dimensions, a.essayScore);
      return {
        quizLabel: a.quiz.label,
        tema: a.quiz.tema,
        finalScore: a.finalScore,
        dimensions,
        conclusionText: kes?.text ?? "",
        weakDimensions: kes?.weakDimensions ?? [],
      };
    }),
    literasi: literasiSubs.map((s) => ({
      sessionLabel: s.session.label,
      reading: s.scores[0]?.reading ?? null,
      listening: s.scores[0]?.listening ?? null,
      writingContent: s.scores[0]?.writingContent ?? null,
      writingQuality: s.scores[0]?.writingQuality ?? null,
    })),
  };
}

/** Ambang dimensi kokurikuler dianggap kuat dalam kalimat draf. */
const AMBANG_KUAT_DRAF = 60;

function daftar(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;
}

/**
 * Draf kesimpulan tahunan untuk siswa, memakai HANYA level yang sudah
 * divalidasi Guru BK. Kalimat tiap indikasi diambil dari interpretGestalt
 * (satu sumber teks). Draf hanya titik awal: Guru BK wajib membaca, mengubah,
 * lalu menerbitkannya sendiri. Kosong bila belum ada level tervalidasi.
 */
export function buildConclusionDraft(recap: StudentYearRecap): string {
  const validated = recap.levels.filter((l) => l.state === "TERVALIDASI");
  if (validated.length === 0) return "";

  const paragraphs: string[] = [];
  paragraphs.push(
    `Pada tahun ajaran ${recap.yearLabel}, kamu mengikuti tes grafologi ${daftar(validated.map((l) => l.label))} yang sudah dibaca dan divalidasi Guru BK. Berikut gambaran yang terbaca dari tulisanmu.`
  );

  // Indikasi per variabel dari level tervalidasi TERBARU; bila level sebelumnya beda, disebut sekilas.
  const ordered = [...validated].reverse(); // terbaru dulu
  const lines: string[] = [];
  for (const variable of ["kemiringan", "ukuran", "spasi"] as const) {
    const results = ordered
      .map((l) => ({ label: l.label, r: l.gestalt?.find((g) => g.variable === variable) }))
      .filter((x): x is { label: string; r: Extract<GestaltResult, { measured: true }> } => !!x.r && x.r.measured);
    if (results.length === 0) continue;
    const latest = results[0];
    let line = `${latest.r.variableLabel}: ${latest.r.title}. ${latest.r.description}`;
    const earlier = results.slice(1).find((x) => x.r.category !== latest.r.category);
    if (earlier) line += ` (Di ${earlier.label}, kecenderungannya berbeda: ${earlier.r.title.toLowerCase()}.)`;
    lines.push(line);
  }
  if (lines.length) paragraphs.push(lines.join("\n"));

  const strengthTitles = [...new Set(validated.flatMap((l) => l.strengths.map((s) => s.title)))];
  if (strengthTitles.length) paragraphs.push(`Potensi yang dibaca Guru BK dari tulisanmu: ${daftar(strengthTitles)}.`);

  // Kokurikuler: pakai kalimat kesimpulan tema (sama dengan kartu "bahan input rapot")
  // bila tersedia; kalau tema tak dikenal, jatuh ke ringkasan persen per dimensi.
  const kokTexts = [...new Set(recap.kokurikuler.map((k) => k.conclusionText).filter(Boolean))];
  if (kokTexts.length) {
    let t = `Dari kuis kokurikuler: ${kokTexts.join(" ")}`;
    const weak = [...new Set(recap.kokurikuler.flatMap((k) => k.weakDimensions))];
    if (weak.length) t += ` Dimensi ${daftar(weak)} masih perlu dilatih lagi.`;
    paragraphs.push(t);
  } else {
    const dimByName = new Map<string, number[]>();
    for (const k of recap.kokurikuler) {
      for (const d of k.dimensions) {
        if (d.total === 0) continue;
        if (!dimByName.has(d.dimension)) dimByName.set(d.dimension, []);
        dimByName.get(d.dimension)!.push(d.pct);
      }
    }
    const dims = [...dimByName.entries()]
      .map(([name, p]) => ({ name, pct: Math.round(p.reduce((a, b) => a + b, 0) / p.length) }))
      .sort((a, b) => b.pct - a.pct);
    if (dims.length) {
      const best = dims[0];
      const lemah = dims.filter((d) => d.pct < AMBANG_KUAT_DRAF).map((d) => d.name);
      if (best.pct >= AMBANG_KUAT_DRAF) {
        let t = `Dari kuis kokurikuler, dimensi yang paling menonjol adalah ${best.name} (${best.pct}% jawaban sesuai).`;
        if (lemah.length) t += ` Dimensi ${daftar(lemah)} masih bisa terus dilatih.`;
        paragraphs.push(t);
      } else {
        paragraphs.push(
          `Hasil kuis kokurikuler tahun ini menunjukkan masih banyak ruang untuk berlatih, terutama pada dimensi ${daftar(dims.map((d) => d.name))}. Ini bisa dikembangkan pelan-pelan lewat latihan dan pendampingan.`
        );
      }
    }
  }

  const saranBk = new Set<string>();
  for (const l of [...validated].reverse()) {
    if (l.learningSuggestions) saranBk.add(l.learningSuggestions.trim());
  }
  if (saranBk.size) {
    paragraphs.push(`Saran dari pembacaan Guru BK: ${[...saranBk].join(" ")}`);
  } else {
    const saran = new Set<string>();
    const latest = validated[validated.length - 1];
    for (const g of latest.gestalt ?? []) if (g.measured && saran.size < 3) saran.add(g.saran);
    if (saran.size) paragraphs.push(`Saran cara belajar: ${[...saran].join(" ")}`);
  }

  paragraphs.push(
    "Ini adalah gambaran kecenderungan, bukan penilaian benar atau salah. Kamu bisa mendiskusikannya lagi dengan Guru BK kapan saja."
  );
  return paragraphs.join("\n\n");
}
