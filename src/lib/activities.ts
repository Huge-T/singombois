import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";

export interface ActivityCard {
  id: string;
  title: string;
  category: string;
  year: number;
  createdAt: Date;
  photos: { id: string; url: string }[];
}

/** Semua kegiatan (lintas sekolah — situs publik ini belum multi-tenant per
 *  halaman, sama seperti getImpactStats/getApprovedTestimonials), terbaru
 *  dulu per tahun — dipakai halaman /giat (tab tahun). */
export async function getActivities(): Promise<ActivityCard[]> {
  return withRetry(() =>
    prisma.activity.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: { photos: { orderBy: { createdAt: "asc" } } },
    })
  );
}

/** Kegiatan terbaru lintas tahun untuk pratinjau ringkas di beranda. */
export async function getRecentActivities(limit = 6): Promise<ActivityCard[]> {
  return withRetry(() =>
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { photos: { orderBy: { createdAt: "asc" }, take: 1 } },
    })
  );
}

/** Kegiatan satu sekolah untuk panel koordinator (di sana schoolId sudah
 *  tersedia dari sesi login, jadi tetap discope dengan benar). */
export async function getActivitiesForSchool(schoolId: string): Promise<ActivityCard[]> {
  return withRetry(() =>
    prisma.activity.findMany({
      where: { schoolId },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: { photos: { orderBy: { createdAt: "asc" } } },
    })
  );
}
