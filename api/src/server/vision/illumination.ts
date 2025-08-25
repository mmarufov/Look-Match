// Simple gray-world normalization fallback operating on masked pixels.

export function normalizeIlluminationRGB(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Uint8Array
): Uint8ClampedArray {
  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x);
      if (mask[i] >= 128) {
        const p = i * 4;
        rSum += data[p];
        gSum += data[p + 1];
        bSum += data[p + 2];
        n++;
      }
    }
  }
  if (n === 0) return data;
  const rMean = rSum / n;
  const gMean = gSum / n;
  const bMean = bSum / n;
  const mean = (rMean + gMean + bMean) / 3;
  // Use single brightness scale to preserve chroma; clamp to reduce whitening
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  const brightScale = clamp(mean ? 128 / mean : 1, 0.8, 1.35);
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i] < 128) continue; // adjust only masked (garment) pixels
      const p = i * 4;
      out[p] = Math.max(0, Math.min(255, Math.round(out[p] * brightScale)));
      out[p + 1] = Math.max(0, Math.min(255, Math.round(out[p + 1] * brightScale)));
      out[p + 2] = Math.max(0, Math.min(255, Math.round(out[p + 2] * brightScale)));
    }
  }
  return out;
}


