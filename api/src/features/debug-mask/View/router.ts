import { Router } from 'express';
import { PNG } from 'pngjs';
import { getMask } from '../Model/store';

export function createDebugMaskRouter() {
  const router = Router();
  router.get('/api/debug-mask/:id', (req, res) => {
    const entry = getMask(req.params.id);
    if (!entry) return res.status(404).send('No mask');
    const png = new PNG({ width: entry.width, height: entry.height, colorType: 6 });
    for (let y = 0; y < entry.height; y++) {
      for (let x = 0; x < entry.width; x++) {
        const i = (y * entry.width + x);
        const p = i * 4;
        png.data[p] = 0; png.data[p + 1] = 0; png.data[p + 2] = 255; png.data[p + 3] = entry.mask[i];
      }
    }
    res.setHeader('Content-Type', 'image/png');
    png.pack().pipe(res);
  });
  return router;
}


