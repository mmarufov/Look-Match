import pLimit from 'p-limit';
import { Request, Response } from 'express';
import { z } from 'zod';
import { rankResults, calculateMetrics } from '../Model/rank';
import { validateProductUrls } from '../Model/validate';
import { mockSources, SerpAPISource, eBaySource, BingSource, AliExpressSource } from '../Model/sources';
import { Source, SourceResult } from '../../../shared/types';
import { createCacheAdapter } from '../../../core/cache/Model/redis';

const matchesQuerySchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const searchLimiter = pLimit(4);

export function createSearchController() {
  const sources: Source[] = [ ...mockSources, new SerpAPISource(), new eBaySource(), new BingSource(), new AliExpressSource() ];
  return {
    async handleMatches(req: Request, res: Response) {
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        const parsed = matchesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues?.[0];
          return res.status(400).json({ ok: false, error: firstIssue?.message || 'Invalid query' });
        }
        const { query, limit = 20 } = parsed.data;
        const cache = createCacheAdapter();
        const cached = cache ? await cache.get(query) : null;
        if (cached) {
          return res.json({ ok: true, results: cached.results, total: cached.total, verifiedCount: cached.verifiedCount } as any);
        }
        const searchPromises = sources.map(source => searchLimiter(
          () => source.search(query, { limit: Math.ceil(limit / sources.length), timeoutMs: 10000 })
        ));
        const settled = await Promise.allSettled(searchPromises);
        let allResults: SourceResult[] = [];
        settled.forEach((r) => { if (r.status === 'fulfilled') allResults.push(...r.value); });
        if (allResults.length === 0) return res.json({ ok: true, results: [], total: 0, verifiedCount: 0 } as any);
        const uniqueResults = deduplicateResults(allResults);
        const validationSubset = uniqueResults.slice(0, Math.min(uniqueResults.length, 10));
        const validationResults = await validateProductUrls(validationSubset.map(r => r.url), undefined, undefined);
        validationSubset.forEach((result, i) => { result.verified = validationResults[i].verified; });
        const rankedResults = rankResults(uniqueResults, { category: 'clothing', colors: [], brandHints: [], confidence: 0 } as any);
        const finalResults = rankedResults.slice(0, limit);
        const m = calculateMetrics(finalResults);
        if (cache) {
          await cache.set(query, { results: finalResults, total: m.totalResults, verifiedCount: m.verifiedCount } as any, 60 * 60 * 1000);
        }
        return res.json({ ok: true, results: finalResults, total: m.totalResults, verifiedCount: m.verifiedCount } as any);
      } catch (err: any) {
        console.error('Error in matches route:', err);
        return res.status(500).json({ ok: false, results: [], total: 0, verifiedCount: 0, error: err.message || 'Search error' } as any);
      }
    }
  };
}

function deduplicateResults(results: SourceResult[]): SourceResult[] {
  const seen = new Set<string>();
  const unique: SourceResult[] = [];
  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    if (!seen.has(normalizedUrl)) { seen.add(normalizedUrl); unique.push(result); }
  }
  return unique;
}

function normalizeUrl(url: string): string {
  try { const urlObj = new URL(url); return `${urlObj.hostname.toLowerCase()}${urlObj.pathname}`; } catch { return url.toLowerCase(); }
}


