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
  const rScale = rMean ? mean / rMean : 1;
  const gScale = gMean ? mean / gMean : 1;
  const bScale = bMean ? mean / bMean : 1;
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.max(0, Math.min(255, Math.round(out[i] * rScale)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(out[i + 1] * gScale)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(out[i + 2] * bScale)));
  }
  return out;
}


