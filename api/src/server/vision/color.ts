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


