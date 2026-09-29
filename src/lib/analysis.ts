import sharp from "sharp";
import {
  type ComponentBox,
  type GrayImage,
  type RgbImage,
  connectedComponents,
  cvPercent,
  detectRuledLines,
  estimateSlant,
  laplacianVariance,
  median,
  otsuThreshold,
  quadrantBrightness,
  stdev,
} from "@/lib/vision";

// v1.1: kemiringan (slant) kini diukur via shear-projection untuk kebutuhan
// variabel Gestalt "kemiringan huruf" — sebelumnya sengaja tak diukur.
export const EXTRACTOR_VERSION = "geo-v1.1";

/** Printed rule color on the worksheet template — see WorksheetPrint component. Must match. */
const RULE_COLOR: [number, number, number] = [203, 216, 230]; // #CBD8E6
const MARGIN_COLOR: [number, number, number] = [232, 180, 168]; // #E8B4A8

const ANALYSIS_WIDTH = 1400; // normalize so all thresholds below are meaningful

export interface QualityGate {
  accepted: boolean;
  flags: { code: string; message: string }[];
  blurVariance: number;
  width: number;
  height: number;
}

export interface Calibration {
  method: "ruled_line" | "unavailable";
  mmPerPx: number | null;
  ruledLinesDetected: number;
  linePositionsPx: number[];
}

export interface AspectValue {
  value: number | null; // in the aspect's native unit
  unit: string;
  confidence: number; // 0..1
}

export interface RawFeatures {
  xHeight: AspectValue;
  sizeConsistency: AspectValue; // CV %
  baselineDeviation: AspectValue; // mm
  wordSpacingRatio: AspectValue; // x-height multiples
  spacingConsistency: AspectValue; // CV %
  marginDeviation: AspectValue; // mm
  slant: AspectValue; // deliberately unmeasured in v1
  scratchDensity: AspectValue; // deliberately unmeasured in v1
  componentCount: number;
  lineBandsDetected: number;
}

export interface AnalysisResult {
  extractorVersion: string;
  gate: QualityGate;
  calibration: Calibration;
  features: RawFeatures;
}

async function loadGray(buffer: Buffer, width: number): Promise<GrayImage> {
  const { data, info } = await sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize({ width, withoutEnlargement: false })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

async function loadRgb(buffer: Buffer, width: number): Promise<RgbImage> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width, withoutEnlargement: false })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

function unmeasured(unit: string): AspectValue {
  return { value: null, unit, confidence: 0 };
}

/**
 * Runs the quality gate (UP-4): rejects images that can't be measured reliably
 * instead of scoring them anyway. This is the "reject rather than fabricate" rule from the PRD.
 */
export async function runQualityGate(buffer: Buffer): Promise<QualityGate> {
  const meta = await sharp(buffer).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const flags: { code: string; message: string }[] = [];

  if (width < 900 || height < 1200) {
    flags.push({
      code: "LOW_RESOLUTION",
      message: "Resolusi foto terlalu rendah. Foto ulang lebih dekat dengan kamera fokus.",
    });
  }

  const gray = await loadGray(buffer, Math.min(ANALYSIS_WIDTH, width || ANALYSIS_WIDTH));
  const blurVariance = laplacianVariance(gray);
  if (blurVariance < 45) {
    flags.push({
      code: "BLUR",
      message: "Foto tampak buram. Pastikan kamera fokus sebelum memotret.",
    });
  }

  const grid = quadrantBrightness(gray);
  const flat = grid.flat();
  const unevenness = Math.max(...flat) / Math.max(1, Math.min(...flat));
  if (unevenness > 1.9) {
    flags.push({
      code: "UNEVEN_LIGHT",
      message: "Pencahayaan tidak merata. Foto di tempat dengan cahaya rata, hindari bayangan.",
    });
  }

  return { accepted: flags.length === 0, flags, blurVariance, width, height };
}

/**
 * Calibrates mm-per-pixel using the printed ruled-line spacing on the worksheet
 * (v1 simplification of the fiducial-marker calibration described in the PRD §5.3/MAT-5).
 */
async function calibrate(buffer: Buffer, lineHeightMm: number): Promise<Calibration> {
  const rgb = await loadRgb(buffer, ANALYSIS_WIDTH);
  const lines = detectRuledLines(rgb, RULE_COLOR);

  if (lines.length < 3) {
    return { method: "unavailable", mmPerPx: null, ruledLinesDetected: lines.length, linePositionsPx: lines };
  }

  const spacings: number[] = [];
  for (let i = 1; i < lines.length; i++) spacings.push(lines[i] - lines[i - 1]);
  const spacingPx = median(spacings);

  return {
    method: "ruled_line",
    mmPerPx: lineHeightMm / spacingPx,
    ruledLinesDetected: lines.length,
    linePositionsPx: lines,
  };
}

function detectMarginColumn(rgb: RgbImage): number | null {
  const { data, width, height } = rgb;
  let bestCol = -1;
  let bestScore = 0;
  for (let x = 0; x < width; x++) {
    let matches = 0;
    for (let y = 0; y < height; y++) {
      const o = (y * width + x) * 3;
      const dr = data[o] - MARGIN_COLOR[0];
      const dg = data[o + 1] - MARGIN_COLOR[1];
      const db = data[o + 2] - MARGIN_COLOR[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) < 30) matches++;
    }
    const score = matches / height;
    if (score > bestScore) {
      bestScore = score;
      bestCol = x;
    }
  }
  return bestScore > 0.4 ? bestCol : null;
}

interface LineBand {
  top: number;
  bottom: number;
  components: ComponentBox[];
}

function groupIntoWords(components: ComponentBox[], gapThresholdPx: number): ComponentBox[][] {
  const sorted = [...components].sort((a, b) => a.minX - b.minX);
  const words: ComponentBox[][] = [];
  let current: ComponentBox[] = [];
  let lastMaxX = -Infinity;

  for (const c of sorted) {
    if (current.length > 0 && c.minX - lastMaxX > gapThresholdPx) {
      words.push(current);
      current = [];
    }
    current.push(c);
    lastMaxX = Math.max(lastMaxX, c.maxX);
  }
  if (current.length > 0) words.push(current);
  return words;
}

export async function extractFeatures(
  buffer: Buffer,
  opts: { lineHeightMm: number; minWords: number }
): Promise<{ calibration: Calibration; features: RawFeatures; rejected?: string }> {
  const calibration = await calibrate(buffer, opts.lineHeightMm);
  const gray = await loadGray(buffer, ANALYSIS_WIDTH);
  const { data, width, height } = gray;

  const threshold = otsuThreshold(gray);
  const rgb = await loadRgb(buffer, ANALYSIS_WIDTH);

  // Ink mask: dark pixels that are not part of a printed rule line.
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= threshold) continue;
    const o = i * 3;
    const dr = rgb.data[o] - RULE_COLOR[0];
    const dg = rgb.data[o + 1] - RULE_COLOR[1];
    const db = rgb.data[o + 2] - RULE_COLOR[2];
    const nearRule = Math.sqrt(dr * dr + dg * dg + db * db) < 40;
    if (!nearRule) mask[i] = 1;
  }

  const allComponents = connectedComponents(mask, width, height, 6, width * height * 0.02);

  // Bucket components into line bands using detected ruled lines, or a single
  // band spanning the whole image when calibration is unavailable.
  const bandBounds: [number, number][] =
    calibration.linePositionsPx.length >= 2
      ? calibration.linePositionsPx.slice(1).map((y, i) => [calibration.linePositionsPx[i], y] as [number, number])
      : [[0, height]];

  const bands: LineBand[] = bandBounds.map(([top, bottom]) => ({
    top,
    bottom,
    components: allComponents.filter((c) => {
      const centerY = (c.minY + c.maxY) / 2;
      return centerY >= top && centerY < bottom;
    }),
  }));

  const populatedBands = bands.filter((b) => b.components.length >= 2);

  if (allComponents.length < opts.minWords) {
    return {
      calibration,
      features: emptyFeatures(allComponents.length, populatedBands.length),
      rejected: `Sampel tulisan terlalu sedikit (terdeteksi ~${allComponents.length} unit tulisan, minimal ${opts.minWords}).`,
    };
  }

  const mmPerPx = calibration.mmPerPx;
  const sampleFactor = Math.min(1, populatedBands.length / 4); // more line bands -> more confidence

  // --- x-height & size consistency ---
  const heights = allComponents.map((c) => c.maxY - c.minY + 1);
  const xHeightPx = median(heights);
  const sizeConsistencyCv = cvPercent(heights);

  // --- baseline deviation & slope, per band, averaged ---
  const baselineDevsPx: number[] = [];
  for (const band of populatedBands) {
    const baselines = band.components.map((c) => c.maxY);
    baselineDevsPx.push(stdev(baselines));
  }
  const baselineDevPx = baselineDevsPx.length ? median(baselineDevsPx) : NaN;

  // --- word spacing ---
  const wordGapRatios: number[] = [];
  const wordGapsPx: number[] = [];
  for (const band of populatedBands) {
    const bandHeights = band.components.map((c) => c.maxY - c.minY + 1);
    const bandXHeight = median(bandHeights) || xHeightPx;
    const words = groupIntoWords(band.components, bandXHeight * 0.55);
    for (let i = 1; i < words.length; i++) {
      const prevMax = Math.max(...words[i - 1].map((c) => c.maxX));
      const curMin = Math.min(...words[i].map((c) => c.minX));
      const gap = curMin - prevMax;
      if (gap > 0) {
        wordGapsPx.push(gap);
        wordGapRatios.push(gap / bandXHeight);
      }
    }
  }
  const wordSpacingRatio = wordGapRatios.length ? median(wordGapRatios) : NaN;
  const spacingConsistencyCv = wordGapsPx.length >= 2 ? cvPercent(wordGapsPx) : NaN;

  // --- margin compliance ---
  const marginCol = detectMarginColumn(rgb);
  const lineStartXs = populatedBands
    .map((band) => Math.min(...band.components.map((c) => c.minX)))
    .filter((x) => Number.isFinite(x));
  const marginReference = marginCol ?? median(lineStartXs);
  const marginDevPx = lineStartXs.length ? stdev(lineStartXs.map((x) => x - marginReference)) : NaN;

  const confBase = allComponents.length >= opts.minWords ? 0.55 + 0.35 * sampleFactor : 0;
  const calibratedConf = calibration.method === "ruled_line" ? confBase : Math.min(confBase, 0.3);

  // --- kemiringan huruf (variabel Gestalt) --- skor per baris tulisan supaya
  // kesejajaran antar baris (mis. margin kiri rata) tidak membiaskan sudut.
  const slantEstimate = estimateSlant(
    mask,
    width,
    height,
    populatedBands.length > 0 ? populatedBands.map((b) => b.components) : [allComponents]
  );

  const features: RawFeatures = {
    xHeight: mmPerPx
      ? { value: xHeightPx * mmPerPx, unit: "mm", confidence: calibratedConf }
      : { value: xHeightPx, unit: "px", confidence: Math.min(confBase, 0.35) },
    sizeConsistency: { value: sizeConsistencyCv, unit: "%", confidence: confBase },
    baselineDeviation: mmPerPx && Number.isFinite(baselineDevPx)
      ? { value: baselineDevPx * mmPerPx, unit: "mm", confidence: calibratedConf }
      : unmeasured("mm"),
    wordSpacingRatio: Number.isFinite(wordSpacingRatio)
      ? { value: wordSpacingRatio, unit: "x", confidence: confBase }
      : unmeasured("x"),
    spacingConsistency: Number.isFinite(spacingConsistencyCv)
      ? { value: spacingConsistencyCv, unit: "%", confidence: wordGapsPx.length >= 4 ? confBase : confBase * 0.5 }
      : unmeasured("%"),
    marginDeviation: mmPerPx && Number.isFinite(marginDevPx)
      ? { value: marginDevPx * mmPerPx, unit: "mm", confidence: calibratedConf * (marginCol ? 1 : 0.7) }
      : unmeasured("mm"),
    slant:
      slantEstimate.angleDeg !== null && slantEstimate.confidence >= 0.25
        ? {
            value: slantEstimate.angleDeg,
            unit: "deg",
            confidence: Math.min(confBase, slantEstimate.confidence),
          }
        : unmeasured("deg"),
    // Scratch-out density needs ink-density modelling beyond current scope —
    // reporting "tidak dapat dinilai" is the honest call per PRD AN-2.
    scratchDensity: unmeasured("%"),
    componentCount: allComponents.length,
    lineBandsDetected: populatedBands.length,
  };

  return { calibration, features };
}

function emptyFeatures(componentCount: number, lineBandsDetected: number): RawFeatures {
  return {
    xHeight: unmeasured("mm"),
    sizeConsistency: unmeasured("%"),
    baselineDeviation: unmeasured("mm"),
    wordSpacingRatio: unmeasured("x"),
    spacingConsistency: unmeasured("%"),
    marginDeviation: unmeasured("mm"),
    slant: unmeasured("deg"),
    scratchDensity: unmeasured("%"),
    componentCount,
    lineBandsDetected,
  };
}
