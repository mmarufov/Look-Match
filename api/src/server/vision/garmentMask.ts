import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { removeBackground } = require('rembg-node');

export interface Rect { x: number; y: number; width: number; height: number }

export interface GarmentMaskResult {
  roi: Rect;
  width: number;
  height: number;
  mask: Uint8Array; // 0 or 255 per pixel within ROI
  meta: { method: string; maskedAreaPercent: number };
  roiRgba: Uint8ClampedArray; // RGBA buffer of ROI aligned with mask
}

function toHSV(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export async function buildGarmentMask(imageBuffer: Buffer, _visionHints?: any): Promise<GarmentMaskResult> {
  // Downscale for speed
  const base = sharp(imageBuffer).rotate();
  const meta = await base.metadata();
  const targetWidth = Math.min(meta.width || 512, 768);
  const resized = await base.resize({ width: targetWidth }).toBuffer();

  // Person/background separation
  let cut: Buffer;
  try {
    cut = await removeBackground(resized);
  } catch {
    cut = resized; // fallback
  }

  const img = sharp(cut);
  const { width = 1, height = 1 } = await img.metadata();
  const rgba = await img.ensureAlpha().raw().toBuffer();

  // Torso ROI (center 60% height, full width)
  const y0 = Math.floor(height * 0.2);
  const y1 = Math.floor(height * 0.8);
  const roi: Rect = { x: 0, y: y0, width, height: y1 - y0 };

  // Foreground mask from alpha
  const mask = new Uint8Array(roi.width * roi.height);
  const roiRgba = new Uint8ClampedArray(roi.width * roi.height * 4);
  for (let y = roi.y; y < roi.y + roi.height; y++) {
    for (let x = roi.x; x < roi.x + roi.width; x++) {
      const idx = (y * width + x) * 4;
      const a = rgba[idx + 3];
      const mi = (y - roi.y) * roi.width + (x - roi.x);
      mask[mi] = a > 10 ? 255 : 0;
      const po = mi * 4;
      roiRgba[po] = rgba[idx];
      roiRgba[po + 1] = rgba[idx + 1];
      roiRgba[po + 2] = rgba[idx + 2];
      roiRgba[po + 3] = rgba[idx + 3];
    }
  }

  // Sample skin from upper-center box to suppress it
  const fx0 = Math.floor(width * 0.35), fx1 = Math.floor(width * 0.65);
  const fy0 = Math.floor(height * 0.12), fy1 = Math.floor(height * 0.25);
  let hSum = 0, sSum = 0, vSum = 0, n = 0;
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const idx = (y * width + x) * 4;
      const a = rgba[idx + 3];
      if (a > 10) {
        const { h, s, v } = toHSV(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
        hSum += h; sSum += s; vSum += v; n++;
      }
    }
  }
  if (n > 50) {
    const hMean = hSum / n, sMean = sSum / n, vMean = vSum / n;
    // Remove pixels close to skin in HSV
    for (let y = roi.y; y < roi.y + roi.height; y++) {
      for (let x = roi.x; x < roi.x + roi.width; x++) {
        const idx = (y * width + x) * 4;
        const mi = (y - roi.y) * roi.width + (x - roi.x);
        if (mask[mi] === 0) continue;
        const { h, s, v } = toHSV(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
        const dh = Math.min(Math.abs(h - hMean), 360 - Math.abs(h - hMean));
        const ds = Math.abs(s - sMean);
        const dv = Math.abs(v - vMean);
        if (dh < 25 && ds < 0.18 && dv < 0.2) {
          mask[mi] = 0;
        }
      }
    }
  }

  // Compute masked area percent
  let count = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] >= 128) count++;
  const percent = (count / mask.length) * 100;

  return { roi, width: roi.width, height: roi.height, mask, meta: { method: 'rembg+roi+skin', maskedAreaPercent: percent }, roiRgba };
}


