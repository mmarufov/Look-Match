// Minimal LAB estimation and palette mapping fallback without heavy deps

export interface ExtractedColor {
  base: string;
  hex: string;
  label: string;
  confidence: number;
}

const PALETTE: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', gray: '#808080',
  navy: '#001f3f', blue: '#1e6bd6', red: '#e61919', green: '#2ecc40',
  beige: '#d9c8a3', brown: '#8b5a2b', pink: '#ff9ecb', yellow: '#ffe033',
  purple: '#7d3ac1', orange: '#ff8c1a'
};

export function extractColorFallback(maskedRgb: Uint8ClampedArray, width: number, height: number, mask: Uint8Array): ExtractedColor {
  // Compute simple luminance and chroma proxy
  let lSum = 0, cSum = 0, n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] >= 128) {
      const p = i * 4;
      const r = maskedRgb[p], g = maskedRgb[p + 1], b = maskedRgb[p + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const rg = Math.abs(r - g), gb = Math.abs(g - b), rb = Math.abs(r - b);
      const c = (rg + gb + rb) / 3;
      lSum += l;
      cSum += c;
      n++;
    }
  }
  if (n === 0) return { base: 'unknown', hex: '#000000', label: 'unknown', confidence: 0 };
  const Lmean = lSum / n;
  const Cmean = cSum / n;
  if (Lmean >= 200 && Cmean <= 8) return { base: 'white', hex: '#FFFFFF', label: 'white', confidence: 0.9 };
  if (Lmean <= 35 && Cmean <= 12) return { base: 'black', hex: '#000000', label: 'black', confidence: 0.9 };
  if (Lmean > 35 && Lmean < 200 && Cmean <= 10) return { base: 'gray', hex: '#808080', label: 'gray', confidence: 0.7 };
  // Fallback chromatic: pick closest average hue using simple mapping
  // Compute average RGB and map to palette heuristically
  let rAvg = 0, gAvg = 0, bAvg = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] >= 128) {
      const p = i * 4;
      rAvg += maskedRgb[p]; gAvg += maskedRgb[p + 1]; bAvg += maskedRgb[p + 2];
    }
  }
  rAvg /= n; gAvg /= n; bAvg /= n;
  // Simple decisions
  const max = Math.max(rAvg, gAvg, bAvg);
  const min = Math.min(rAvg, gAvg, bAvg);
  const d = max - min;
  let label = 'blue';
  if (d < 15) label = 'gray';
  else if (max === rAvg && gAvg >= bAvg) label = 'orange';
  else if (max === rAvg) label = 'red';
  else if (max === gAvg) label = 'green';
  else if (max === bAvg && rAvg < 40) label = 'navy';
  else label = 'blue';
  const hex = PALETTE[label] || '#1e6bd6';
  return { base: label, hex, label, confidence: 0.6 };
}

// Optimized color extraction using masked ROI from garmentMask
// Convert sRGB [0..255] to linearized sRGB [0..1]
function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

// Convert linear RGB to XYZ (D65)
function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  // sRGB to XYZ matrix (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return { x, y, z };
}

// Convert XYZ to CIE L*a*b*
function xyzToLab(x: number, y: number, z: number): { L: number; a: number; b: number } {
  // Reference white D65
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  function f(t: number): number {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
  }

  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}

function srgbToLab(r8: number, g8: number, b8: number): { L: number; a: number; b: number } {
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  if (h.length === 6) {
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  // Fallback
  return { r: 0, g: 0, b: 0 };
}

function distanceLab(a: { L: number; a: number; b: number }, b: { L: number; a: number; b: number }): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function extractColorFromMask(roiRgba: Uint8ClampedArray, width: number, height: number, mask: Uint8Array): ExtractedColor {
  // Accumulate LAB over masked pixels and collect samples for quantiles
  let Lsum = 0, asum = 0, bsum = 0, n = 0;
  const Lsamples: number[] = [];
  const chromaSamples: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] >= 128) {
      const p = i * 4;
      const r = roiRgba[p];
      const g = roiRgba[p + 1];
      const b = roiRgba[p + 2];
      const lab = srgbToLab(r, g, b);
      Lsum += lab.L;
      asum += lab.a;
      bsum += lab.b;
      Lsamples.push(lab.L);
      chromaSamples.push(Math.sqrt(lab.a * lab.a + lab.b * lab.b));
      n++;
    }
  }
  if (n === 0) return { base: 'unknown', hex: '#000000', label: 'unknown', confidence: 0 };

  const Lmean = Lsum / n;
  const amean = asum / n;
  const bmean = bsum / n;
  const chroma = Math.sqrt(amean * amean + bmean * bmean);

  function quantile(arr: number[], q: number): number {
    if (arr.length === 0) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
    return a[idx];
    }

  const Lp85 = quantile(Lsamples, 0.85);
  const chromaMedian = quantile(chromaSamples, 0.5);

  // Achromatic decisions in LAB (tightened thresholds to reduce white bias)
  if (chroma < 5 && chromaMedian < 7) {
    // Use upper luminance percentile to discount shadows
    if (Lp85 >= 90 && Lmean >= 85) return { base: 'white', hex: '#FFFFFF', label: 'white', confidence: 0.9 };
    if (Lmean <= 18) return { base: 'black', hex: '#000000', label: 'black', confidence: 0.92 };
    return { base: 'gray', hex: '#808080', label: 'gray', confidence: 0.75 };
  }

  // Precompute palette LAB
  let best: { label: string; hex: string; dist: number } | null = null;
  const target = { L: Lmean, a: amean, b: bmean };
  for (const [label, hex] of Object.entries(PALETTE)) {
    const { r, g, b } = hexToRgb(hex);
    const lab = srgbToLab(r, g, b);
    const dist = distanceLab(target, lab);
    if (!best || dist < best.dist) best = { label, hex, dist };
  }
  if (!best) return { base: 'unknown', hex: '#000000', label: 'unknown', confidence: 0 };

  // Map base to achromatic or chromatic label
  const base = best.label as string;
  // Confidence inversely proportional to distance; clamp to [0.55, 0.96]
  // Typical LAB distances to named colors range ~5-40
  const conf = Math.max(0.55, Math.min(0.96, 1 - best.dist / 55));
  return { base, hex: best.hex, label: best.label, confidence: conf };
}


