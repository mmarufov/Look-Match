import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import fs from "node:fs";
import path from "path";
import pLimit from 'p-limit';
import { z } from 'zod';

// Import our modules
import { normalizeVisionAttributes } from './vision/normalize';
import { generateProductDescription } from './describe/describe';
import { buildSearchQuery } from './search/buildQuery';
import { validateProductUrls } from './urls/validate';
import { rankResults, calculateMetrics } from './rank/score';
import { searchCache } from './cache/lru';
import { mockSources } from './sources/mock';
import { SerpAPISource } from './sources/serp';
import { eBaySource } from './sources/ebay';
import { BingSource } from './sources/bing';

// Import types
import { 
  AnalyzeResponse, 
  MatchesResponse, 
  VisionAttributes, 
  SourceResult,
  Source 
} from '../shared/types';

// Resolve credentials: use env var if set, otherwise try ./google-credentials.json in project root
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Initialize sources
const sources: Source[] = [
  ...mockSources, // Always include mock sources for testing
  new SerpAPISource(),
  new eBaySource(),
  new BingSource()
];

// Concurrency limiter for source searches
const searchLimiter = pLimit(4);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "lookmatch-api",
    creds: hasKeyFile ? "file" : process.env.GOOGLE_APPLICATION_CREDENTIALS ? "env" : "none",
    sources: sources.map(s => ({ name: s.name, enabled: true })),
    cache: searchCache.getStats()
  });
});

// Zod schemas
const matchesQuerySchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

// Analyze endpoint: expects multipart/form-data with field name "image"
app.post(
  "/analyze",
  upload.single("image"),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image uploaded" });
      }

      console.log(`[${requestId}] Starting image analysis`);

      // Enhanced Vision API analysis
      const [labelResult, webResult] = await Promise.all([
        // Label detection for general object recognition
        visionClient.labelDetection({
          image: { content: req.file.buffer },
        }),
        
        // Web detection for best guess tags and web entities
        visionClient.webDetection({
          image: { content: req.file.buffer },
        })
      ]);

      // Process labels with confidence scores
      const labels =
        (labelResult[0]?.labelAnnotations || [])
          .map((l: any) => ({ description: l.description, score: l.score }))
          .filter((l: any) => !!l.description)
          .slice(0, 10);

      // Enhanced web detection with multiple sources
      const webTags = [
        ...(webResult[0]?.webDetection?.bestGuessLabels || []).map((x: any) => x.label),
        ...(webResult[0]?.webDetection?.webEntities || [])
          .filter((entity: any) => entity.score && entity.score > 0.7)
          .map((entity: any) => entity.description)
          .slice(0, 5)
      ].filter(Boolean);

      // Extract color information from labels and web tags
      const colors = extractColorsFromText([...webTags, ...labels.map(l => l.description)]);
      
      // Extract clothing-specific information
      const clothingInfo = extractClothingInfo(labels, webTags);

      console.log(`[${requestId}] Vision analysis complete:`, {
        labels: labels.length,
        webTags: webTags.length,
        colors: colors.length,
        clothingInfo
      });

      // Normalize attributes
      const attributes = normalizeVisionAttributes(labels, webTags, colors);
      
      // Generate product description
      const { description, query } = generateProductDescription(attributes);
      
      // Build search query
      const searchQuery = buildSearchQuery(attributes);

      const analysisTime = Date.now() - startTime;
      console.log(`[${requestId}] Analysis completed in ${analysisTime}ms`);

      const response: AnalyzeResponse = {
        ok: true,
        attributes,
        description,
        query
      };

      // Back-compat fields for existing frontend (can be removed once UI migrates)
      res.json({
        ...response,
        labels,
        webTags,
        colors,
        clothingInfo,
        analysis: {
          dominantColor: colors[0]?.name || 'Unknown',
          clothingType: clothingInfo.type || 'Clothing',
          confidence: labels[0]?.score || 0
        }
      });
      
    } catch (err: any) {
      console.error(`[${requestId}] Analysis error:`, err);
      const response: AnalyzeResponse = {
        ok: false,
        attributes: {
          category: 'clothing',
          colors: [],
          brandHints: [],
          confidence: 0
        },
        description: 'Analysis failed',
        query: '',
        error: err.message || "Vision error"
      };
      res.status(500).json(response);
    }
  }
);

// Matches endpoint: search for products
app.get("/matches", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const parsed = matchesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      return res.status(400).json({ ok: false, error: firstIssue?.message || 'Invalid query' });
    }
    const { query, limit = 20 } = parsed.data;

    console.log(`[${requestId}] Starting product search for: "${query}"`);

    // Check cache first
    const cacheKey = searchCache.generateKey(query);
    const cachedResults = searchCache.get(query);
    
    if (cachedResults) {
      console.log(`[${requestId}] Returning cached results`);
      const response: MatchesResponse = {
        ok: true,
        results: cachedResults.results,
        total: cachedResults.total,
        verifiedCount: cachedResults.verifiedCount
      };
      return res.json(response);
    }

    // Search all sources in parallel with concurrency limit
    const searchPromises = sources.map(source => 
      searchLimiter(() => source.search(query, { 
        limit: Math.ceil(limit / sources.length), 
        timeoutMs: 10000 
      }))
    );

    const sourceResults = await Promise.allSettled(searchPromises);
    
    // Collect all results
    let allResults: SourceResult[] = [];
    sourceResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
        console.log(`[${requestId}] Source ${sources[index].name}: ${result.value.length} results`);
      } else {
        console.error(`[${requestId}] Source ${sources[index].name} failed:`, result.reason);
      }
    });

    if (allResults.length === 0) {
      const response: MatchesResponse = {
        ok: true,
        results: [],
        total: 0,
        verifiedCount: 0
      };
      return res.json(response);
    }

    // Deduplicate results by URL
    const uniqueResults = deduplicateResults(allResults);
    console.log(`[${requestId}] Deduplicated to ${uniqueResults.length} results`);

    // Validate URLs (for a subset to avoid timeouts)
    const validationSubset = uniqueResults.slice(0, Math.min(uniqueResults.length, 10));
    const validationResults = await validateProductUrls(
      validationSubset.map(r => r.url),
      undefined, // expectedBrand
      undefined  // expectedCategory
    );

    // Update verification status
    validationSubset.forEach((result, index) => {
      result.verified = validationResults[index].verified;
    });

    // Rank results
    const rankedResults = rankResults(uniqueResults, {
      category: 'clothing',
      colors: [],
      brandHints: [],
      confidence: 0
    });

    // Limit results
    const finalResults = rankedResults.slice(0, limit);
    
    // Calculate metrics
    const metrics = calculateMetrics(finalResults);

    const searchTime = Date.now() - startTime;
    console.log(`[${requestId}] Search completed in ${searchTime}ms, ${metrics.verifiedCount}/${metrics.totalResults} verified`);

    // Cache results
    searchCache.set(query, {}, {
      results: finalResults,
      total: metrics.totalResults,
      verifiedCount: metrics.verifiedCount
    });

    const response: MatchesResponse = {
      ok: true,
      results: finalResults,
      total: metrics.totalResults,
      verifiedCount: metrics.verifiedCount
    };

    res.json(response);
    
  } catch (err: any) {
    console.error(`[${requestId}] Search error:`, err);
    const response: MatchesResponse = {
      ok: false,
      results: [],
      total: 0,
      verifiedCount: 0,
      error: err.message || "Search error"
    };
    res.status(500).json(response);
  }
});

// Helper functions (moved from the old implementation)
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
    const lowerText = text.toLowerCase();
    Object.keys(colorMap).forEach(color => {
      if (lowerText.includes(color)) {
        foundColors[color] = (foundColors[color] || 0) + 1;
      }
    });
  });
  
  return Object.entries(foundColors)
    .map(([color, count]) => ({
      ...colorMap[color],
      score: count / texts.length
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function extractClothingInfo(labels: any[], webTags: string[]): {type: string; confidence: number} {
  const allText = [...webTags, ...labels.map(l => l.description)].join(' ').toLowerCase();
  
  const clothingTypes = [
    { keywords: ['t-shirt', 'tshirt', 't shirt'], name: 'T-Shirt' },
    { keywords: ['polo', 'polo shirt'], name: 'Polo Shirt' },
    { keywords: ['sweater', 'sweatshirt'], name: 'Sweater' },
    { keywords: ['hoodie'], name: 'Hoodie' },
    { keywords: ['jacket'], name: 'Jacket' },
    { keywords: ['coat'], name: 'Coat' },
    { keywords: ['blazer'], name: 'Blazer' },
    { keywords: ['dress'], name: 'Dress' },
    { keywords: ['skirt'], name: 'Skirt' },
    { keywords: ['pants', 'jeans', 'trousers'], name: 'Pants' },
    { keywords: ['shirt'], name: 'Shirt' }
  ];
  
  for (const clothingType of clothingTypes) {
    if (clothingType.keywords.some(keyword => allText.includes(keyword))) {
      return { type: clothingType.name, confidence: 0.9 };
    }
  }
  
  return { type: 'Clothing', confidence: 0.5 };
}

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

// Cache cleanup every hour
setInterval(() => {
  const cleaned = searchCache.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired cache entries`);
  }
}, 60 * 60 * 1000);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`LookMatch API Server listening on http://localhost:${port}`);
  console.log(`Sources enabled: ${sources.map(s => s.name).join(', ')}`);
  
  if (!hasKeyFile && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(
      "⚠️  No Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place google-credentials.json in the API root."
    );
  }
  
  // Log environment status
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mock mode: ${sources.filter(s => s.name.includes('Mock')).length} mock sources active`);
});
