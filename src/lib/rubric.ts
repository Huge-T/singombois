import type { RawFeatures } from "@/lib/analysis";

/**
 * Kerapian (writing-quality) rubric — stored as versioned code (not a black box)
 * per PRD AN-3/AN-4: "bobot & rumus terbuka, terdokumentasi, berversi" and
 * "guru dapat membuka kenapa skornya segini".
 *
 * Each mapping below is a documented piecewise-linear function from a raw,
 * physically-measured quantity to a 0-100 sub-score. Thresholds were chosen
 * to match the ranges described in the PRD's own worked example (plate 02)
 * and can be revised by the team without touching the extraction code.
 */
export const RUBRIC_VERSION = "kerapian-v1.0";

const CONFIDENCE_FLOOR = 0.4; // below this, AN-2 says: don't score it, flag "tidak dapat dinilai"

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export interface AspectScore {
  key: string;
  label: string;
  score: number | null; // 0-100, or null if unmeasured
  rawValue: number | null;
  unit: string;
  confidence: number;
  measured: boolean;
}

function scoreConsistency(cvPercent: number): number {
  // 0% variation -> 100, >=40% variation -> 0
  return clamp(100 - cvPercent * 2.5);
}

function scoreBaselineDeviation(mm: number): number {
  // 0mm deviation -> 100, >=3mm -> 0
  return clamp(100 - mm * 33.33);
}

function scoreSpacingRatio(ratio: number): number {
  // Ideal inter-word gap ~= 1.0x x-height. Penalize distance from 1.0.
  return clamp(100 - Math.abs(ratio - 1.0) * 140);
}

function scoreSpacingConsistency(cvPercent: number): number {
  return clamp(100 - cvPercent * 2);
}

function scoreMarginDeviation(mm: number): number {
  // 0mm deviation -> 100, >=2.5mm -> 0
  return clamp(100 - mm * 40);
}

export function scoreAspects(features: RawFeatures): AspectScore[] {
  const aspects: AspectScore[] = [];

  const push = (
    key: string,
    label: string,
    av: { value: number | null; unit: string; confidence: number },
    scorer: (v: number) => number
  ) => {
    const measured = av.value !== null && av.confidence >= CONFIDENCE_FLOOR;
    aspects.push({
      key,
      label,
      score: measured ? scorer(av.value as number) : null,
      rawValue: av.value,
      unit: av.unit,
      confidence: av.confidence,
      measured,
    });
  };

  push("sizeConsistency", "Konsistensi tinggi huruf", features.sizeConsistency, scoreConsistency);
  push("baselineDeviation", "Kesejajaran baris", features.baselineDeviation, scoreBaselineDeviation);

  // "Jarak antar kata" blends two raw measurements — how close the median gap is to
  // the ideal ratio, and how consistent that gap is line to line — into one row,
  // matching the single "Jarak antar kata" line the mockup shows to students.
  const spacingMeasured =
    features.wordSpacingRatio.value !== null && features.wordSpacingRatio.confidence >= CONFIDENCE_FLOOR;
  const ratioScore = spacingMeasured ? scoreSpacingRatio(features.wordSpacingRatio.value as number) : null;
  const consistencyScore =
    features.spacingConsistency.value !== null && features.spacingConsistency.confidence >= CONFIDENCE_FLOOR
      ? scoreSpacingConsistency(features.spacingConsistency.value as number)
      : null;
  aspects.push({
    key: "wordSpacingRatio",
    label: "Jarak antar kata",
    score:
      ratioScore !== null && consistencyScore !== null
        ? Math.round((ratioScore + consistencyScore) / 2)
        : ratioScore ?? consistencyScore,
    rawValue: features.wordSpacingRatio.value,
    unit: features.wordSpacingRatio.unit,
    confidence: features.wordSpacingRatio.confidence,
    measured: spacingMeasured,
  });

  push("marginDeviation", "Kepatuhan margin", features.marginDeviation, scoreMarginDeviation);
  push("slant", "Kemiringan", features.slant, () => 0);
  push("scratchDensity", "Kepadatan coretan", features.scratchDensity, () => 0);

  return aspects;
}

/** Weighted overall Skor Kerapian — only from aspects that were actually measured (AN-2). */
export function overallWritingQuality(aspects: AspectScore[]): number | null {
  const weights: Record<string, number> = {
    sizeConsistency: 0.3,
    baselineDeviation: 0.25,
    wordSpacingRatio: 0.25,
    marginDeviation: 0.2,
  };
  const usable = aspects.filter((a) => a.measured && weights[a.key] !== undefined);
  if (usable.length === 0) return null;

  const totalWeight = usable.reduce((s, a) => s + weights[a.key], 0);
  const weighted = usable.reduce((s, a) => s + weights[a.key] * (a.score as number), 0);
  return Math.round(weighted / totalWeight);
}

/** Picks the single weakest measured aspect to surface as this week's focus (LAT-2: one at a time). */
export function pickFocusAspect(aspects: AspectScore[]): AspectScore | null {
  const measured = aspects.filter((a) => a.measured && a.score !== null);
  if (measured.length === 0) return null;
  return measured.reduce((worst, a) => ((a.score as number) < (worst.score as number) ? a : worst));
}
