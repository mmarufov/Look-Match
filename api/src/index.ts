import express, { Request, Response } from "express";
import cors from "cors";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import fs from "node:fs";
import path from "path";
import pLimit from 'p-limit';
import { z } from 'zod';
import { createAnalyzeRouter } from './features/analyze/View/analyzeRouter';
import { createDebugMaskRouter } from './features/debug-mask/View/router';
import { createMatchesRouter } from './features/matches/View/router';
import { validateProductUrls } from './features/matches/Model/validate';
import { rankResults, calculateMetrics } from './features/matches/Model/rank';
import { searchCache } from './core/cache/Model/lru';
import { createCacheAdapter } from './core/cache/Model/redis';
import { mockSources, SerpAPISource, eBaySource, BingSource, AliExpressSource } from './features/matches/Model/sources';
import { 
  MatchesResponse, 
  SourceResult,
  Source 
} from './shared/types';
import { createHealthRouter } from './features/health/View/router';

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
app.use(express.static(path.join(__dirname, '../public')));
app.use(createDebugMaskRouter());

// Init telemetry (no-op if not configured)

// Sources (env-gated external connectors)
const sources: Source[] = [
  ...mockSources,
  new SerpAPISource(),
  new eBaySource(),
  new BingSource(),
  new AliExpressSource()
];

// Root route - API info page
app.get('/', (req, res) => {
  res.json({
    service: 'LookMatch API',
    version: '1.0.0',
    description: 'AI-powered clothing detection and product matching',
    endpoints: {
      health: '/health',
      analyze: '/analyze (POST with image)',
      matches: '/api/matches?query=...',
      debug: '/api/debug-mask/:id'
    },
    documentation: 'https://github.com/your-repo/lookmatch-api',
    status: 'live'
  });
});

// Feature routers
app.use(createAnalyzeRouter(visionClient));
app.use(createMatchesRouter());
app.use(createDebugMaskRouter());
app.use(createHealthRouter(sources));

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

// Health route handled by MVVM router

// Analyze routes handled via feature router

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
    const cache = createCacheAdapter();
    const cached = cache ? await cache.get(query) : null;
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
        () => source.search(query, {
          limit: Math.ceil(limit / sources.length),
          timeoutMs: 10000,
        })
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

    if (cache) {
      await cache.set(query, {
        results: finalResults,
        total: m.totalResults,
        verifiedCount: m.verifiedCount,
      }, 60 * 60 * 1000);
    }

    const response: MatchesResponse = {
      ok: true,
      results: finalResults,
      total: m.totalResults,
      verifiedCount: m.verifiedCount,
    } as any;
    return res.json(response);
  } catch (err: any) {
    console.error(`[${requestId}] Matches error:`, err);
    console.error('Error details:', { requestId, route: 'matches', query: (req.query?.query as string) || '' });
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

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`LookMatch API Server listening on http://localhost:${port}`);
  if (!hasKeyFile && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("⚠️  No Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place google-credentials.json in the API root.");
  }
  console.log(`Sources enabled: ${sources.map(s => s.name).join(', ')}`);
});
