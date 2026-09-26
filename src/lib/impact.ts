import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";
import { wibMidnight } from "@/lib/wibTime";

/** Data untuk bagian Kemanfaatan di beranda. Semua angka dihitung live dari
 *  database — tidak ada angka yang diketik manual.
 *
 *  Beranda publik ini dilihat siapa saja lewat serverless function yang
 *  sering cold-start (koneksi Neon baru tiap kali), beda dari script
 *  diagnostik lokal yang pakai satu koneksi hangat berulang — makanya
 *  butuh withRetry di sini padahal query-nya sendiri sudah benar (terbukti
 *  konsisten kalau dites lewat koneksi yang sama berkali-kali). */

export interface ImpactStats {
  studentsServed: number; // distinct siswa dengan pembacaan karakter terbit
  classesInProgram: number; // distinct kelas yang punya sesi
  feedbackCount: number;
  visitCount: number; // pengunjung-hari unik (dedup harian di tabel)
}

export async function getImpactStats(): Promise<ImpactStats> {
  const [readings, classGroups, feedbackCount, parentReviewCount, visitCount] = await withRetry(() =>
    Promise.all([
      prisma.characterReading.findMany({
        where: { status: "PUBLISHED" },
        select: { submission: { select: { studentId: true } } },
      }),
      prisma.session.groupBy({ by: ["classId"] }),
      prisma.feedback.count(),
      prisma.parentReview.count(),
      prisma.pageVisit.count(),
    ])
  );

  return {
    studentsServed: new Set(readings.map((r) => r.submission.studentId)).size,
    classesInProgram: classGroups.length,
    // "Tanggapan masuk" mencakup angket siswa DAN ulasan orang tua — dua
    // sumber tanggapan yang beda modelnya tapi sama-sama masuk hitungan ini.
    feedbackCount: feedbackCount + parentReviewCount,
    visitCount,
  };
}

export interface DayBucket {
  label: string; // tanggal kalender WIB hari itu, mis. "25 Mei"
  count: number;
}

/** Kunjungan per hari kalender WIB (bukan jendela geser 24 jam server) — hari
 *  ini (bucket terakhir) selalu tanggal WIB saat ini, jadi grafik terlihat
 *  maju tiap hari alih-alih "macet" di satu tanggal. Sebelumnya dihitung per
 *  minggu dengan label = awal jendela, kelihatan seperti tidak update karena
 *  labelnya tidak berubah selama 7 hari penuh. */
export async function getDailyVisits(days = 14): Promise<DayBucket[]> {
  const todayWib = wibMidnight(new Date());
  const since = new Date(todayWib.getTime() - (days - 1) * 24 * 3600 * 1000);
  const visits = await withRetry(() =>
    prisma.pageVisit.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    })
  );

  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(todayWib.getTime() - i * 24 * 3600 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const count = visits.filter((v) => v.createdAt >= dayStart && v.createdAt < dayEnd).length;
    buckets.push({
      label: dayStart.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }),
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
  const feedbacks = await withRetry(() =>
    prisma.feedback.findMany({
      select: { clarityScore: true, student: { select: { class: { select: { name: true } } } } },
    })
  );

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
  const feedbacks = await withRetry(() =>
    prisma.feedback.findMany({
      where: { approved: true, displayConsent: { not: "TIDAK" } },
      include: { student: { include: { class: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  );

  return feedbacks.map((f) => ({
    id: f.id,
    impression: f.impression,
    attribution:
      f.displayConsent === "DENGAN_NAMA" ? f.student.name : `Siswa ${f.student.class.name}`,
  }));
}
