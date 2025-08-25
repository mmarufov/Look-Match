// Minimal LAB estimation and palette mapping fallback without heavy deps

export interface ExtractedColor {
  base: string;
  hex: string;
  label: string;
  confidence: number;
}

const PALETTE: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', gray: '#808080',
  lightgray: '#D3D3D3', darkgray: '#505050',
  navy: '#001f3f', blue: '#1e6bd6', sky: '#60a5fa',
  teal: '#14b8a6', turquoise: '#40E0D0', cyan: '#22d3ee',
  green: '#22c55e', lime: '#84cc16', olive: '#556B2F',
  yellow: '#facc15', gold: '#f59e0b', orange: '#f97316',
  red: '#ef4444', maroon: '#800000', pink: '#ff9ecb',
  purple: '#7d3ac1', indigo: '#4f46e5', violet: '#8b5cf6',
  brown: '#8b5a2b', beige: '#d9c8a3', tan: '#d2b48c', khaki: '#f0e68c', cream: '#fffdd0'
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

// CIEDE2000 DeltaE implementation (Sharma et al., 2004)
function deltaE2000(a: { L: number; a: number; b: number }, b: { L: number; a: number; b: number }): number {
  const L1 = a.L, a1 = a.a, b1 = a.b;
  const L2 = b.L, a2 = b.a, b2 = b.b;

  const kL = 1, kC = 1, kH = 1;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1pRad = Math.atan2(b1, a1p);
  const h2pRad = Math.atan2(b2, a2p);
  const h1p = (h1pRad >= 0 ? h1pRad : h1pRad + 2 * Math.PI) * 180 / Math.PI;
  const h2p = (h2pRad >= 0 ? h2pRad : h2pRad + 2 * Math.PI) * 180 / Math.PI;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (isNaN(C1p) || isNaN(C2p)) dhp = 0;
  else if (dhp > 180) dhp -= 360;
  else if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (Math.abs(h1p - h2p) > 180) hbarp += 360;
  hbarp /= 2;
  if (isNaN(h1p) || isNaN(h2p)) hbarp = h1p + h2p;

  const T = 1 - 0.17 * Math.cos((hbarp - 30) * Math.PI/180) + 0.24 * Math.cos((2 * hbarp) * Math.PI/180) + 0.32 * Math.cos((3 * hbarp + 6) * Math.PI/180) - 0.20 * Math.cos((4 * hbarp - 63) * Math.PI/180);
  const dRo = 30 * Math.exp(-((hbarp - 275) / 25) * ((hbarp - 275) / 25));
  const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * (Lbarp - 50) * (Lbarp - 50)) / Math.sqrt(20 + (Lbarp - 50) * (Lbarp - 50));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dRo * Math.PI/180) * Rc;

  const dE = Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
    Math.pow(dCp / (kC * Sc), 2) +
    Math.pow(dHp / (kH * Sh), 2) +
    Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
  );
  return isFinite(dE) ? dE : 0;
}

export function extractColorFromMask(roiRgba: Uint8ClampedArray, width: number, height: number, mask: Uint8Array): ExtractedColor {
  // Sample LAB values from masked pixels with stride to cap work
  const labs: Array<{L:number;a:number;b:number;c:number}> = [];
  const total = mask.length;
  const targetSamples = 30000;
  const stride = Math.max(1, Math.floor(total / targetSamples));
  for (let i = 0; i < total; i += stride) {
    if (mask[i] >= 128) {
      const p = i * 4;
      const lab = srgbToLab(roiRgba[p], roiRgba[p + 1], roiRgba[p + 2]);
      const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
      labs.push({ L: lab.L, a: lab.a, b: lab.b, c });
    }
  }
  if (labs.length === 0) return { base: 'unknown', hex: '#000000', label: 'unknown', confidence: 0 };

  const Lsamples = labs.map(x => x.L);
  const csamples = labs.map(x => x.c);

  function quantile(arr: number[], q: number): number {
    if (arr.length === 0) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
    return a[idx];
  }

  const Lmedian = quantile(Lsamples, 0.5);
  const Lp70 = quantile(Lsamples, 0.7);
  const Lp85 = quantile(Lsamples, 0.85);
  const Lp90 = quantile(Lsamples, 0.9);
  const chromaMedian = quantile(csamples, 0.5);
  const highLFraction = Lsamples.filter(L => L >= 88).length / Lsamples.length;
  const lowLFraction = Lsamples.filter(L => L <= 18).length / Lsamples.length;
  const lowChromaFraction = csamples.filter(c => c < 6).length / csamples.length;

  // Strong neutral handling first
  if (lowChromaFraction >= 0.7) {
    if (highLFraction >= 0.5 || (Lp90 >= 90 && (Lmedian >= 84 || Lp70 >= 88))) {
      return { base: 'white', hex: '#FFFFFF', label: 'white', confidence: 0.97 };
    }
    if (lowLFraction >= 0.6 || Lmedian <= 16) {
      return { base: 'black', hex: '#000000', label: 'black', confidence: 0.95 };
    }
    const label = (Lmedian >= 75 ? 'lightgray' : (Lmedian <= 35 ? 'darkgray' : 'gray'));
    return { base: label, hex: PALETTE[label], label, confidence: 0.88 };
  }

  // Two-cluster k-means in a*b* to find chromatic mode vs neutral
  const maxCIdx = csamples.indexOf(Math.max(...csamples));
  let c0 = { a: 0, b: 0 };
  let c1 = { a: labs[maxCIdx].a, b: labs[maxCIdx].b };
  for (let iter = 0; iter < 6; iter++) {
    let sum0a = 0, sum0b = 0, n0 = 0;
    let sum1a = 0, sum1b = 0, n1 = 0;
    for (let i = 0; i < labs.length; i++) {
      const da0 = labs[i].a - c0.a; const db0 = labs[i].b - c0.b;
      const da1 = labs[i].a - c1.a; const db1 = labs[i].b - c1.b;
      const d0 = da0 * da0 + db0 * db0;
      const d1 = da1 * da1 + db1 * db1;
      if (d0 <= d1) { sum0a += labs[i].a; sum0b += labs[i].b; n0++; }
      else { sum1a += labs[i].a; sum1b += labs[i].b; n1++; }
    }
    if (n0 > 0) { c0 = { a: sum0a / n0, b: sum0b / n0 }; }
    if (n1 > 0) { c1 = { a: sum1a / n1, b: sum1b / n1 }; }
  }

  // Assign clusters and compute means
  let s0a = 0, s0b = 0, s0L = 0, n0 = 0, c0sum = 0;
  let s1a = 0, s1b = 0, s1L = 0, n1 = 0, c1sum = 0;
  for (let i = 0; i < labs.length; i++) {
    const d0 = (labs[i].a - c0.a) ** 2 + (labs[i].b - c0.b) ** 2;
    const d1 = (labs[i].a - c1.a) ** 2 + (labs[i].b - c1.b) ** 2;
    if (d0 <= d1) { s0a += labs[i].a; s0b += labs[i].b; s0L += labs[i].L; c0sum += labs[i].c; n0++; }
    else { s1a += labs[i].a; s1b += labs[i].b; s1L += labs[i].L; c1sum += labs[i].c; n1++; }
  }
  const m0 = { a: n0 ? s0a / n0 : 0, b: n0 ? s0b / n0 : 0, L: n0 ? s0L / n0 : Lmedian, meanC: n0 ? c0sum / n0 : 0, size: n0 };
  const m1 = { a: n1 ? s1a / n1 : 0, b: n1 ? s1b / n1 : 0, L: n1 ? s1L / n1 : Lmedian, meanC: n1 ? c1sum / n1 : 0, size: n1 };
  const chromaCluster = m0.meanC >= m1.meanC ? m0 : m1;
  const neutralCluster = m0.meanC >= m1.meanC ? m1 : m0;
  const chromaFrac = chromaCluster.size / Math.max(1, (chromaCluster.size + neutralCluster.size));

  let targetLab = { L: Lmedian, a: 0, b: 0 };
  if (chromaCluster.meanC >= 10 && chromaFrac >= 0.35) {
    targetLab = { L: chromaCluster.L, a: chromaCluster.a, b: chromaCluster.b };
  } else {
    if (highLFraction >= 0.5 && (Lmedian >= 82 || Lp85 >= 88)) {
      return { base: 'white', hex: '#FFFFFF', label: 'white', confidence: 0.9 };
    }
    if (Lmedian <= 18) {
      return { base: 'black', hex: '#000000', label: 'black', confidence: 0.9 };
    }
    const label = (Lmedian >= 75 ? 'lightgray' : (Lmedian <= 35 ? 'darkgray' : 'gray'));
    return { base: label, hex: PALETTE[label], label, confidence: 0.8 };
  }

  // Precompute palette in LAB
  const paletteLab: Record<string, { L: number; a: number; b: number }> = {};
  for (const [label, hex] of Object.entries(PALETTE)) {
    const { r, g, b } = hexToRgb(hex);
    paletteLab[label] = srgbToLab(r, g, b);
  }

  // Nearest by CIEDE2000
  let best: { label: string; hex: string; dist: number } | null = null;
  for (const [label, plab] of Object.entries(paletteLab)) {
    const d = deltaE2000(targetLab, plab);
    if (!best || d < best.dist) best = { label, hex: PALETTE[label], dist: d };
  }
  if (!best) return { base: 'unknown', hex: '#000000', label: 'unknown', confidence: 0 };

  const confidence = Math.max(0.6, Math.min(0.99, 1 - best.dist / 25));
  return { base: best.label, hex: best.hex, label: best.label, confidence };
}


