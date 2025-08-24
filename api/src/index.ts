import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import fs from "node:fs";
import path from "path";
import pLimit from 'p-limit';
import { z } from 'zod';

// Server modules
import { normalizeVisionAttributes } from './server/vision/normalize';
import { generateProductDescription } from './server/describe/describe';
import { buildSearchQuery } from './server/search/buildQuery';
import { validateProductUrls } from './server/urls/validate';
import { rankResults, calculateMetrics } from './server/rank/score';
import { searchCache } from './server/cache/lru';
import { createCacheAdapter } from './server/cache/redis';
import { initSentry, captureException, withSentryBreadcrumb } from './server/telemetry/sentry';
import { mockSources } from './server/sources/mock';
import { SerpAPISource } from './server/sources/serp';
import { eBaySource } from './server/sources/ebay';
import { BingSource } from './server/sources/bing';
import { AliExpressSource } from './server/sources/aliexpress';
import { buildGarmentMask } from './server/vision/garmentMask';
import { normalizeIlluminationRGB } from './server/vision/illumination';
import { extractColorFallback } from './server/vision/color';
import { inferStyleFallback } from './server/vision/style';
import { createDebugMaskRouter, storeMask } from './server/routes/debugMask';

// Types
import { 
  AnalyzeResponse, 
  MatchesResponse, 
  VisionAttributes, 
  SourceResult,
  Source 
} from './shared/types';

// Resolve credentials: env var or ./google-credentials.json in project root
const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), "google-credentials.json");

const hasKeyFile = fs.existsSync(keyPath);
const visionClient = hasKeyFile
  ? new ImageAnnotatorClient({ keyFilename: keyPath })
  : new ImageAnnotatorClient();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(createDebugMaskRouter());

// Init telemetry (no-op if not configured)
initSentry();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Sources (env-gated external connectors)
const sources: Source[] = [
  ...mockSources,
  new SerpAPISource(),
  new eBaySource(),
  new BingSource(),
  new AliExpressSource()
];

// Concurrency limiter for source searches
const searchLimiter = pLimit(4);

// Simple metrics counters
const metrics = {
  requestsAnalyze: 0,
  requestsMatches: 0,
  matchesVerified: 0,
  matchesTotal: 0,
  lastSearchLatencyMs: 0,
};

// Helpers
function deduplicateResults(results: SourceResult[]): SourceResult[] {
  const seen = new Set<string>();
  const unique: SourceResult[] = [];
  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      unique.push(result);
    }
  }
  return unique;
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname.toLowerCase()}${urlObj.pathname}`;
  } catch {
    return url.toLowerCase();
  }
}

// Zod schemas
const analyzeBodySchema = z.object({
  imageUrl: z.string().url().optional(),
});

const matchesQuerySchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "lookmatch-api",
    creds: hasKeyFile ? "file" : process.env.GOOGLE_APPLICATION_CREDENTIALS ? "env" : "none",
    sources: sources.map(s => ({ name: s.name, enabled: true })),
    cache: searchCache.getStats(),
    metrics: {
      requestsAnalyze: metrics.requestsAnalyze,
      requestsMatches: metrics.requestsMatches,
      verifiedRate: metrics.matchesTotal ? metrics.matchesVerified / metrics.matchesTotal : null,
      lastSearchLatencyMs: metrics.lastSearchLatencyMs,
    },
  });
});

// Analyze: JSON { imageUrl } or multipart form-data (image)
async function handleAnalyze(req: Request & { file?: Express.Multer.File }, res: Response) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  metrics.requestsAnalyze += 1;

  try {
    // Prefer JSON { imageUrl }
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

    // Fallback to multipart
    if (!imageBuffer && req.file) {
      imageBuffer = req.file.buffer;
    }

    if (!imageBuffer) {
      return res.status(400).json({ ok: false, error: "No image provided" });
    }

    // Vision API analysis
    const [labelResult, webResult] = await Promise.all([
      visionClient.labelDetection({ image: { content: imageBuffer } }),
      visionClient.webDetection({ image: { content: imageBuffer } }),
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

    // Extract basic colors from text context (simple heuristic)
    const colors = extractColorsFromText([...webTags, ...labels.map(l => l.description)]);

    // Normalize → attributes
    const attributes = normalizeVisionAttributes(labels, webTags, colors);
    const { description, query } = generateProductDescription(attributes);
    const analysisMs = Date.now() - startTime;

    // New pipeline (fallback implementations)
    const maskRes = await buildGarmentMask(imageBuffer);
    const maskId = requestId;
    try { storeMask(maskId, maskRes.width, maskRes.height, maskRes.mask); } catch {}
    // Build a tiny 1x1 RGBA buffer from original bytes as placeholder
    const rgba = new Uint8ClampedArray(maskRes.width * maskRes.height * 4);
    const normalized = normalizeIlluminationRGB(rgba, maskRes.width, maskRes.height, maskRes.mask);
    const color = extractColorFallback(normalized, maskRes.width, maskRes.height, maskRes.mask);
    const style = inferStyleFallback(labels, maskRes.mask);

    const response: AnalyzeResponse = {
      ok: true,
      attributes,
      description,
      query,
    } as any;

    // Back-compat fields for existing frontend
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
      // New fields
      color,
      category: style.category,
      sleeveLength: style.sleeveLength,
      hasCollar: style.hasCollar,
      pattern: style.pattern,
      confidences: style.confidences,
      debug: { maskId },
    });
  } catch (err: any) {
    console.error(`[${requestId}] Analyze error:`, err);
    captureException(err, { requestId, route: 'analyze' });
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

// JSON route
app.post('/api/analyze', express.json(), handleAnalyze);
// Multipart route (legacy and /api)
app.post('/api/analyze-upload', upload.single('image'), handleAnalyze);
app.post('/analyze', upload.single('image'), handleAnalyze);

// Matches endpoint
app.get("/api/matches", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  metrics.requestsMatches += 1;

  try {
    const parsed = matchesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      return res.status(400).json({ ok: false, error: firstIssue?.message || 'Invalid query' });
    }
    const { query, limit = 20 } = parsed.data;

    // Cache (Redis adapter if available)
    const cache = await createCacheAdapter<{ results: SourceResult[]; total: number; verifiedCount: number }>();
    const cached = await cache.get(query);
    if (cached) {
      const response: MatchesResponse = {
        ok: true,
        results: cached.results,
        total: cached.total,
        verifiedCount: cached.verifiedCount,
      } as any;
      return res.json(response);
    }

    // Search all sources
    const searchPromises = sources.map(source =>
      searchLimiter(
        withSentryBreadcrumb(
          () => source.search(query, {
            limit: Math.ceil(limit / sources.length),
            timeoutMs: 10000,
          }),
          { category: 'source', message: 'search', data: { source: source.name, query } }
        )
      )
    );

    const settled = await Promise.allSettled(searchPromises);
    let allResults: SourceResult[] = [];
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        allResults.push(...r.value);
      } else {
        console.error(`[${requestId}] Source ${sources[idx].name} failed:`, r.reason);
      }
    });

    if (allResults.length === 0) {
      const response: MatchesResponse = { ok: true, results: [], total: 0, verifiedCount: 0 } as any;
      return res.json(response);
    }

    const uniqueResults = deduplicateResults(allResults);

    // Validate subset
    const validationSubset = uniqueResults.slice(0, Math.min(uniqueResults.length, 10));
    const validationResults = await validateProductUrls(
      validationSubset.map(r => r.url),
      undefined,
      undefined
    );
    validationSubset.forEach((result, i) => {
      result.verified = validationResults[i].verified;
    });

    const rankedResults = rankResults(uniqueResults, {
      category: 'clothing',
      colors: [],
      brandHints: [],
      confidence: 0,
    });

    const finalResults = rankedResults.slice(0, limit);
    const m = calculateMetrics(finalResults);
    metrics.matchesVerified += m.verifiedCount;
    metrics.matchesTotal += m.totalResults;
    metrics.lastSearchLatencyMs = Date.now() - startTime;

    await cache.set(query, {
      results: finalResults,
      total: m.totalResults,
      verifiedCount: m.verifiedCount,
    }, 60 * 60 * 1000);

    const response: MatchesResponse = {
      ok: true,
      results: finalResults,
      total: m.totalResults,
      verifiedCount: m.verifiedCount,
    } as any;
    return res.json(response);
  } catch (err: any) {
    console.error(`[${requestId}] Matches error:`, err);
    captureException(err, { requestId, route: 'matches', query: (req.query?.query as string) || '' });
    const response: MatchesResponse = { ok: false, results: [], total: 0, verifiedCount: 0, error: err.message || 'Search error' } as any;
    return res.status(500).json(response);
  }
});

// Legacy path for compatibility
app.get('/matches', (req, res) => {
  (app._router as any).handle({ ...req, url: `/api${req.url}` }, res);
});

// Simple color extraction heuristic (fallback)
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
    'maroon': { name: 'maroon', score: 1.0, hex: '#800000' },
  };
  const found: {[key: string]: number} = {};
  texts.forEach(t => {
    const lower = t?.toLowerCase?.() || '';
    Object.keys(colorMap).forEach(c => {
      if (lower.includes(c)) found[c] = (found[c] || 0) + 1;
    });
  });
  return Object.entries(found)
    .map(([c, count]) => ({ ...colorMap[c], score: count / Math.max(1, texts.length) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`LookMatch API Server listening on http://localhost:${port}`);
  if (!hasKeyFile && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("⚠️  No Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place google-credentials.json in the API root.");
  }
  console.log(`Sources enabled: ${sources.map(s => s.name).join(', ')}`);
});
