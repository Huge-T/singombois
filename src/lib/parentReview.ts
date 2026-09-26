import { prisma } from "@/lib/prisma";

export interface ParentReviewPublic {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface ParentReviewStats {
  count: number;
  average: number | null;
}

export async function getApprovedParentReviews(limit = 6): Promise<ParentReviewPublic[]> {
  return prisma.parentReview.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, rating: true, comment: true, createdAt: true },
  });
}

export async function getParentReviewStats(): Promise<ParentReviewStats> {
  const agg = await prisma.parentReview.aggregate({
    where: { approved: true },
    _count: true,
    _avg: { rating: true },
  });
  return { count: agg._count, average: agg._avg.rating };
}
