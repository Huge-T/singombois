import { prisma } from "@/lib/prisma";

/**
 * Live-measured values for the indicators our v1 instrumentation can actually
 * compute. The journal's other 10 indicators were captured via a survey
 * instrument this product doesn't implement — showing a fabricated "current"
 * number for those would be exactly the kind of invented statistic the PRD's
 * "reject rather than fabricate" principle rules out, so they stay
 * baseline-only until a real instrument exists for them.
 */
export const MEASURABLE_CODES = [
  "reading_comprehension",
  "listening",
  "handwriting_neatness",
  "idea_expression",
  "worksheet_completion",
] as const;

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export async function computeLiveIndicators(schoolId: string) {
  const submitted = await prisma.submission.findMany({
    where: { student: { schoolId }, submittedAt: { not: null } },
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const totalAssigned = await prisma.submission.count({ where: { student: { schoolId } } });

  const readingScores = submitted.map((s) => s.scores[0]?.reading).filter((v): v is number => v != null);
  const listeningScores = submitted.map((s) => s.scores[0]?.listening).filter((v): v is number => v != null);
  const writingQualityScores = submitted
    .map((s) => s.scores[0]?.writingQuality)
    .filter((v): v is number => v != null);
  const contentScores = submitted
    .map((s) => s.scores[0]?.writingContent)
    .filter((v): v is number => v != null);

  const values: Record<string, { value: number | null; sampleN: number }> = {
    reading_comprehension: { value: avg(readingScores), sampleN: readingScores.length },
    listening: { value: avg(listeningScores), sampleN: listeningScores.length },
    handwriting_neatness: { value: avg(writingQualityScores), sampleN: writingQualityScores.length },
    idea_expression: { value: avg(contentScores), sampleN: contentScores.length },
    worksheet_completion: {
      value: totalAssigned > 0 ? Math.round((submitted.length / totalAssigned) * 1000) / 10 : null,
      sampleN: totalAssigned,
    },
  };

  return values;
}
