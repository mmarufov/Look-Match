import { Router, json } from 'express';
import multer from 'multer';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createAnalyzeController } from '../ViewModel/analyze';

export function createAnalyzeRouter(visionClient: ImageAnnotatorClient) {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  const controller = createAnalyzeController(visionClient);
  router.post('/api/analyze', json(), controller.handleAnalyze);
  router.post('/api/analyze-upload', upload.single('image'), controller.handleAnalyze);
  router.post('/analyze', upload.single('image'), controller.handleAnalyze);
  return router;
}


