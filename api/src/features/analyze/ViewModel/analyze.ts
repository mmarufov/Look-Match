import { Request, Response } from 'express';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { z } from 'zod';
import { normalizeVisionAttributes } from '../Model/normalize';
import { generateProductDescription } from '../Model/describe';
import { generateProductDescription as generateLLMDescription } from '../../../core/llm/gemini';
import { buildGarmentMask } from '../Model/garmentMask';
import { normalizeIlluminationRGB } from '../Model/illumination';
import { extractColorFromMask } from '../Model/color';
import { inferStyleFallback } from '../Model/style';
import { storeMask } from '../../debug-mask/Model/store';
import { AnalyzeResponse } from '../../../shared/types';

const analyzeBodySchema = z.object({ imageUrl: z.string().url().optional() });

function extractColorsFromText(texts: string[]): Array<{name: string; score: number; hex: string}> {
  const colorMap: {[key: string]: {name: string; score: number; hex: string}} = {
    'white': { name: 'white', score: 1.0, hex: '#FFFFFF' },
    'black': { name: 'black', score: 1.0, hex: '#000000' },
    'blue': { name: 'blue', score: 1.0, hex: '#0000FF' },
    'red': { name: 'red', score: 1.0, hex: '#FF0000' },
    'green': { name: 'green', score: 1.0, hex: '#00FF00' },
    'yellow': { name: 'yellow', score: 1.0, hex: '#FFFF00' },
    'pink': { name: 'pink', score: 1.0, hex: '#FFC0CB' },
    'purple': { name: 'purple', score: 1.0, hex: '#800080' },
    'orange': { name: 'orange', score: 1.0, hex: '#FFA500' },
    'brown': { name: 'brown', score: 1.0, hex: '#A52A2A' },
    'gray': { name: 'gray', score: 1.0, hex: '#808080' },
    'grey': { name: 'grey', score: 1.0, hex: '#808080' },
    'navy': { name: 'navy', score: 1.0, hex: '#000080' },
    'beige': { name: 'beige', score: 1.0, hex: '#F5F5DC' },
    'cream': { name: 'cream', score: 1.0, hex: '#FFFDD0' },
    'tan': { name: 'tan', score: 1.0, hex: '#D2B48C' },
    'maroon': { name: 'maroon', score: 1.0, hex: '#800000' }
  };
  const foundColors: {[key: string]: number} = {};
  texts.forEach(text => {
    const lowerText = text?.toLowerCase?.() || '';
    Object.keys(colorMap).forEach(color => {
      if (lowerText.includes(color)) {
        foundColors[color] = (foundColors[color] || 0) + 1;
      }
    });
  });
  return Object.entries(foundColors)
    .map(([color, count]) => ({ ...colorMap[color], score: count / Math.max(1, texts.length) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function createAnalyzeController(visionClient: ImageAnnotatorClient) {
  return {
    async handleAnalyze(req: Request & { file?: Express.Multer.File }, res: Response) {
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        let imageBuffer: Buffer | null = null;
        if (req.is('application/json')) {
          const parsed = analyzeBodySchema.safeParse(req.body);
          if (!parsed.success) {
            const issue = parsed.error.issues?.[0];
            return res.status(400).json({ ok: false, error: issue?.message || 'Invalid body' });
          }
          if (parsed.data.imageUrl) {
            const response = await fetch(parsed.data.imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch imageUrl: ${response.status}`);
            const arrayBuf = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
          }
        }
        if (!imageBuffer && req.file) imageBuffer = req.file.buffer;
        if (!imageBuffer) return res.status(400).json({ ok: false, error: 'No image provided' });

        let stdBuffer: Buffer = imageBuffer;
        try {
          const sharpMod = (await import('sharp')).default;
          stdBuffer = await sharpMod(imageBuffer).rotate().jpeg({ quality: 90 }).toBuffer();
        } catch { stdBuffer = imageBuffer; }

        const [labelResult, webResult] = await Promise.all([
          visionClient.labelDetection({ image: { content: stdBuffer } }),
          visionClient.webDetection({ image: { content: stdBuffer } }),
        ]);
        const labels = (labelResult[0]?.labelAnnotations || [])
          .map((l: any) => ({ description: l.description, score: l.score }))
          .filter((l: any) => !!l.description)
          .slice(0, 10);
        const webTags = [
          ...(webResult[0]?.webDetection?.bestGuessLabels || []).map((x: any) => x.label),
          ...(webResult[0]?.webDetection?.webEntities || [])
            .filter((entity: any) => entity.score && entity.score > 0.7)
            .map((entity: any) => entity.description)
            .slice(0, 5),
        ].filter(Boolean);
        const colors = extractColorsFromText([...webTags, ...labels.map(l => l.description)]);

        const attributes = normalizeVisionAttributes(labels, webTags, colors);
        
        // Try Gemini for description, fallback to template
        let description: string;
        const llmDescription = await generateLLMDescription(attributes, labels.map(l => l.description));
        if (llmDescription) {
          description = llmDescription;
        } else {
          const fallback = generateProductDescription(attributes);
          description = fallback.description;
        }
        
        const { query } = generateProductDescription(attributes);

        const maskRes = await buildGarmentMask(stdBuffer);
        // store mask for debug endpoint
        try { storeMask(requestId, maskRes.width, maskRes.height, maskRes.mask); } catch {}
        const normalized = normalizeIlluminationRGB(maskRes.roiRgba, maskRes.width, maskRes.height, maskRes.mask);
        const color = extractColorFromMask(normalized, maskRes.width, maskRes.height, maskRes.mask);
        const style = inferStyleFallback(labels, maskRes.mask);

        const analysisMs = Date.now() - startTime;
        const response: AnalyzeResponse = { ok: true, attributes, description, query } as any;
        return res.json({
          ...response,
          labels,
          webTags,
          colors,
          clothingInfo: { type: attributes.category, confidence: attributes.confidence },
          analysis: {
            dominantColor: colors[0]?.name || 'Unknown',
            clothingType: attributes.category || 'Clothing',
            confidence: attributes.confidence || 0,
            analysisMs,
            requestId,
          },
          color,
          category: style.category,
          sleeveLength: style.sleeveLength,
          hasCollar: style.hasCollar,
          pattern: style.pattern,
          confidences: style.confidences,
          debug: { maskId: requestId },
        });
      } catch (err: any) {
        const response: AnalyzeResponse = {
          ok: false,
          attributes: { category: 'clothing', colors: [], brandHints: [], confidence: 0 },
          description: 'Analysis failed',
          query: '',
          error: err.message || 'Analyze error',
        } as any;
        return res.status(500).json(response);
      }
    }
  };
}


