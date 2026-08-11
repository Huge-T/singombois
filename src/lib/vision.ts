/**
 * Low-level pixel algorithms used by the handwriting-quality pipeline.
 * Pure functions over raw grayscale/RGB buffers — no I/O, no sharp calls here,
 * so they stay unit-testable and independent of the image decoder.
 */

export interface GrayImage {
  data: Uint8ClampedArray; // one byte per pixel, 0-255
  width: number;
  height: number;
}

export interface RgbImage {
  data: Uint8ClampedArray; // 3 bytes per pixel
  width: number;
  height: number;
}

/** Variance of the Laplacian — the standard no-reference blur metric. Higher = sharper. */
export function laplacianVariance(img: GrayImage): number {
  const { data, width, height } = img;
  if (width < 3 || height < 3) return 0;
  const responses = new Float64Array((width - 2) * (height - 2));
  let idx = 0;
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = data[y * width + x];
      const up = data[(y - 1) * width + x];
      const down = data[(y + 1) * width + x];
      const left = data[y * width + (x - 1)];
      const right = data[y * width + (x + 1)];
      const lap = up + down + left + right - 4 * c;
      responses[idx++] = lap;
      sum += lap;
    }
  }
  const mean = sum / responses.length;
  let variance = 0;
  for (let i = 0; i < responses.length; i++) {
    const d = responses[i] - mean;
    variance += d * d;
  }
  return variance / responses.length;
}

/** Otsu's method: finds the threshold that best separates ink from paper. */
export function otsuThreshold(img: GrayImage): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < img.data.length; i++) hist[img.data[i]]++;
  const total = img.data.length;

  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Mean brightness of an image split into a 3x3 grid — used to detect uneven lighting. */
export function quadrantBrightness(img: GrayImage): number[][] {
  const { data, width, height } = img;
  const gx = 3;
  const gy = 3;
  const sums: number[][] = Array.from({ length: gy }, () => new Array(gx).fill(0));
  const counts: number[][] = Array.from({ length: gy }, () => new Array(gx).fill(0));
  for (let y = 0; y < height; y++) {
    const cellY = Math.min(gy - 1, Math.floor((y / height) * gy));
    for (let x = 0; x < width; x++) {
      const cellX = Math.min(gx - 1, Math.floor((x / width) * gx));
      sums[cellY][cellX] += data[y * width + x];
      counts[cellY][cellX]++;
    }
  }
  return sums.map((row, r) => row.map((s, c) => s / Math.max(1, counts[r][c])));
}

export interface ComponentBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pixelCount: number;
}

/**
 * 4-connected connected-component labeling over a binary ink mask.
 * Iterative flood fill (no recursion) so it's safe on large images.
 */
export function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  minPixels = 4,
  maxPixels = Infinity
): ComponentBox[] {
  const visited = new Uint8Array(width * height);
  const boxes: ComponentBox[] = [];
  const stack = new Int32Array(width * height);

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;

    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;

    let minX = start % width;
    let maxX = minX;
    let minY = Math.floor(start / width);
    let maxY = minY;
    let count = 0;

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % width;
      const y = (p - x) / width;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const n = p - 1;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (x < width - 1) {
        const n = p + 1;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y > 0) {
        const n = p - width;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y < height - 1) {
        const n = p + width;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
    }

    if (count >= minPixels && count <= maxPixels) {
      boxes.push({ minX, maxX, minY, maxY, pixelCount: count });
    }
  }

  return boxes;
}

/**
 * Detects near-horizontal ruled lines by scanning rows for a high fraction of
 * pixels matching a target color (the printed rule color on the worksheet).
 * Returns the row indices of detected lines, in order.
 */
export function detectRuledLines(
  img: RgbImage,
  target: [number, number, number],
  tolerance = 28,
  minRowMatchFraction = 0.5
): number[] {
  const { data, width, height } = img;
  const rowScores = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let matches = 0;
    const base = y * width * 3;
    for (let x = 0; x < width; x++) {
      const o = base + x * 3;
      const dr = data[o] - target[0];
      const dg = data[o + 1] - target[1];
      const db = data[o + 2] - target[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) < tolerance) matches++;
    }
    rowScores[y] = matches / width;
  }

  const candidates: number[] = [];
  for (let y = 0; y < height; y++) {
    if (rowScores[y] < minRowMatchFraction) continue;
    // local maximum within a small window
    let isPeak = true;
    for (let w = Math.max(0, y - 3); w <= Math.min(height - 1, y + 3); w++) {
      if (rowScores[w] > rowScores[y]) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) candidates.push(y);
  }

  // merge near-duplicate peaks (within 5px)
  const merged: number[] = [];
  for (const c of candidates) {
    if (merged.length === 0 || c - merged[merged.length - 1] > 5) merged.push(c);
  }
  return merged;
}

/**
 * Estimasi kemiringan tulisan (slant) dengan metode shear-projection klasik:
 * untuk tiap kandidat sudut, piksel tinta digeser horizontal proporsional
 * terhadap y (shear), lalu dihitung ketajaman histogram proyeksi-x (jumlah
 * kuadrat tinggi kolom). Sudut yang membuat goresan paling "tegak" (histogram
 * paling tajam) adalah kemiringan dominan. Konvensi: positif = miring kanan.
 *
 * Skor dihitung PER KELOMPOK BARIS lalu dijumlahkan, tidak atas satu histogram
 * global: penumpukan kolom lintas-baris (mis. awal baris yang rata margin kiri)
 * akan menciptakan diagonal palsu yang membiaskan sudut, padahal kesejajaran
 * antar baris tidak ada hubungannya dengan kemiringan huruf.
 */
export function estimateSlant(
  mask: Uint8Array,
  width: number,
  height: number,
  componentGroups: ComponentBox[][]
): { angleDeg: number | null; confidence: number } {
  // Kumpulkan piksel tinta per kelompok (baris), hanya di dalam kotak komponen
  // tulisan — noise di luar area tulisan sudah tersaring connected components.
  const groups: { xs: number[]; ys: number[] }[] = [];
  let total = 0;
  for (const comps of componentGroups) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const c of comps) {
      for (let y = c.minY; y <= c.maxY; y++) {
        const rowBase = y * width;
        for (let x = c.minX; x <= c.maxX; x++) {
          if (mask[rowBase + x]) {
            xs.push(x);
            ys.push(y);
          }
        }
      }
    }
    if (xs.length >= 60) {
      groups.push({ xs, ys });
      total += xs.length;
    }
  }
  if (total < 300 || groups.length === 0) return { angleDeg: null, confidence: 0 };

  // Subsampel supaya biaya per sudut tetap kecil di foto besar.
  const MAX_SAMPLES = 30000;
  const step = Math.max(1, Math.floor(total / MAX_SAMPLES));

  const MAX_DEG = 30;
  const maxShift = Math.ceil(Math.tan((MAX_DEG * Math.PI) / 180) * height);
  const histSize = width + 2 * maxShift;
  const hist = new Float64Array(histSize);

  let bestDeg = 0;
  let bestScore = -1;
  let scoreSum = 0;
  let scoreCount = 0;

  for (let deg = -MAX_DEG; deg <= MAX_DEG; deg++) {
    const t = Math.tan((deg * Math.PI) / 180);
    let score = 0;
    for (const g of groups) {
      hist.fill(0);
      let lo = histSize;
      let hi = 0;
      for (let i = 0; i < g.xs.length; i += step) {
        const sheared = Math.round(g.xs[i] + t * g.ys[i]) + maxShift;
        if (sheared >= 0 && sheared < histSize) {
          hist[sheared]++;
          if (sheared < lo) lo = sheared;
          if (sheared > hi) hi = sheared;
        }
      }
      for (let b = lo; b <= hi; b++) score += hist[b] * hist[b];
    }
    scoreSum += score;
    scoreCount++;
    if (score > bestScore) {
      bestScore = score;
      bestDeg = deg;
    }
  }

  // Confidence dari seberapa menonjol puncak dibanding rata-rata semua sudut:
  // tulisan dengan arah goresan konsisten menghasilkan puncak yang jelas,
  // coretan acak menghasilkan kurva datar (peakRatio ~ 1).
  const meanScore = scoreSum / scoreCount;
  const peakRatio = meanScore > 0 ? bestScore / meanScore : 1;
  const confidence = Math.max(0, Math.min(1, (peakRatio - 1) * 2.5));

  return { angleDeg: bestDeg, confidence };
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = mean(values.map((x) => (x - m) * (x - m)));
  return Math.sqrt(v);
}

/** Coefficient of variation as a percentage. */
export function cvPercent(values: number[]): number {
  const m = mean(values);
  if (!m) return 0;
  return (stdev(values) / m) * 100;
}
