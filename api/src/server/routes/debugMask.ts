import { Router } from 'express';
import { PNG } from 'pngjs';

// In-memory mask store (simple)
const masks = new Map<string, { width: number; height: number; mask: Uint8Array }>();

export function storeMask(id: string, width: number, height: number, mask: Uint8Array) {
  masks.set(id, { width, height, mask });
}

export function createDebugMaskRouter() {
  const router = Router();
  router.get('/api/debug-mask/:id', (req, res) => {
    const id = req.params.id;
    const entry = masks.get(id);
    if (!entry) {
      return res.status(404).send('No mask');
    }
    const png = new PNG({ width: entry.width, height: entry.height, colorType: 6 });
    for (let y = 0; y < entry.height; y++) {
      for (let x = 0; x < entry.width; x++) {
        const i = (y * entry.width + x);
        const p = i * 4;
        png.data[p] = 0;
        png.data[p + 1] = 0;
        png.data[p + 2] = 255;
        png.data[p + 3] = entry.mask[i];
      }
    }
    res.setHeader('Content-Type', 'image/png');
    png.pack().pipe(res);
  });
  return router;
}


