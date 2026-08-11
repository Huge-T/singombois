/**
 * Cohen's kappa for machine-vs-teacher agreement (CAL-2/CAL-3).
 * We bucket continuous 0-100 scores into three bands before computing kappa —
 * raw percent-agreement on booleans would overstate agreement because it doesn't
 * correct for chance, which is the whole point of using kappa instead of a hit rate.
 */
export type ScoreBand = "rendah" | "sedang" | "tinggi";

export function scoreBand(score: number): ScoreBand {
  if (score < 60) return "rendah";
  if (score < 80) return "sedang";
  return "tinggi";
}

export function cohensKappa(pairs: [ScoreBand, ScoreBand][]): number | null {
  if (pairs.length === 0) return null;

  const bands: ScoreBand[] = ["rendah", "sedang", "tinggi"];
  const matrix: Record<ScoreBand, Record<ScoreBand, number>> = {
    rendah: { rendah: 0, sedang: 0, tinggi: 0 },
    sedang: { rendah: 0, sedang: 0, tinggi: 0 },
    tinggi: { rendah: 0, sedang: 0, tinggi: 0 },
  };

  for (const [a, b] of pairs) matrix[a][b]++;

  const n = pairs.length;
  let po = 0;
  for (const b of bands) po += matrix[b][b];
  po /= n;

  let pe = 0;
  for (const b of bands) {
    const rowTotal = bands.reduce((s, b2) => s + matrix[b][b2], 0);
    const colTotal = bands.reduce((s, b2) => s + matrix[b2][b], 0);
    pe += (rowTotal / n) * (colTotal / n);
  }

  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}

export function kappaHealthLabel(k: number | null): { label: string; tone: "ok" | "warn" | "bad" } {
  if (k === null) return { label: "BELUM CUKUP DATA", tone: "warn" };
  if (k < 0.4) return { label: "RENDAH · SEMBUNYIKAN DARI SISWA", tone: "bad" };
  if (k < 0.6) return { label: "CUKUP", tone: "warn" };
  return { label: "SEHAT", tone: "ok" };
}
