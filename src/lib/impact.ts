import { prisma } from "@/lib/prisma";

/** Data untuk bagian Kemanfaatan di beranda. Semua angka dihitung live dari
 *  database — tidak ada angka yang diketik manual. */

export interface ImpactStats {
  studentsServed: number; // distinct siswa dengan pembacaan karakter terbit
  classesInProgram: number; // distinct kelas yang punya sesi
  feedbackCount: number;
  visitCount: number; // pengunjung-hari unik (dedup harian di tabel)
}

export async function getImpactStats(): Promise<ImpactStats> {
  const [readings, classGroups, feedbackCount, parentReviewCount, visitCount] = await Promise.all([
    prisma.characterReading.findMany({
      where: { status: "PUBLISHED" },
      select: { submission: { select: { studentId: true } } },
    }),
    prisma.session.groupBy({ by: ["classId"] }),
    prisma.feedback.count(),
    prisma.parentReview.count(),
    prisma.pageVisit.count(),
  ]);

  return {
    studentsServed: new Set(readings.map((r) => r.submission.studentId)).size,
    classesInProgram: classGroups.length,
    // "Tanggapan masuk" mencakup angket siswa DAN ulasan orang tua — dua
    // sumber tanggapan yang beda modelnya tapi sama-sama masuk hitungan ini.
    feedbackCount: feedbackCount + parentReviewCount,
    visitCount,
  };
}

export interface WeekBucket {
  label: string; // tanggal awal minggu, mis. "25 Mei"
  count: number;
}

/** Kunjungan per minggu: 8 ember 7-harian, terbaru di kanan. */
export async function getWeeklyVisits(weeks = 8): Promise<WeekBucket[]> {
  const since = new Date(Date.now() - weeks * 7 * 24 * 3600 * 1000);
  const visits = await prisma.pageVisit.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const now = Date.now();
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 7 * 24 * 3600 * 1000);
    const end = new Date(now - i * 7 * 24 * 3600 * 1000);
    const count = visits.filter((v) => v.createdAt >= start && v.createdAt < end).length;
    buckets.push({
      label: start.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      count,
    });
  }
  return buckets;
}

export interface ClassClarity {
  className: string;
  average: number; // 1-5
  n: number;
}

/** Rata-rata skor "paham cara belajar" per kelas. Kelas dengan < minN tanggapan
 *  disembunyikan supaya jawaban individu tidak bisa ditebak dari rata-ratanya. */
export async function getClarityByClass(minN = 3): Promise<ClassClarity[]> {
  const feedbacks = await prisma.feedback.findMany({
    select: { clarityScore: true, student: { select: { class: { select: { name: true } } } } },
  });

  const byClass = new Map<string, number[]>();
  for (const f of feedbacks) {
    const name = f.student.class.name;
    if (!byClass.has(name)) byClass.set(name, []);
    byClass.get(name)!.push(f.clarityScore);
  }

  return [...byClass.entries()]
    .filter(([, scores]) => scores.length >= minN)
    .map(([className, scores]) => ({
      className,
      average: scores.reduce((s, v) => s + v, 0) / scores.length,
      n: scores.length,
    }))
    .sort((a, b) => a.className.localeCompare(b.className));
}

export interface PublicTestimonial {
  id: string;
  impression: string;
  attribution: string; // nama, atau "Siswa VII-C" bila anonim
}

export async function getApprovedTestimonials(limit = 6): Promise<PublicTestimonial[]> {
  const feedbacks = await prisma.feedback.findMany({
    where: { approved: true, displayConsent: { not: "TIDAK" } },
    include: { student: { include: { class: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return feedbacks.map((f) => ({
    id: f.id,
    impression: f.impression,
    attribution:
      f.displayConsent === "DENGAN_NAMA" ? f.student.name : `Siswa ${f.student.class.name}`,
  }));
}
