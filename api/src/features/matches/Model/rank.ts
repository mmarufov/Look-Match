import { SourceResult, VisionAttributes } from '../../../shared/types';

export interface ScoringWeights {
  brandMatch: number;
  categoryMatch: number;
  colorMatch: number;
  materialMatch: number;
  priceReasonable: number;
  merchantTrust: number;
  schemaVerified: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  brandMatch: 0.4,
  categoryMatch: 0.3,
  colorMatch: 0.1,
  materialMatch: 0.1,
  priceReasonable: 0.2,
  merchantTrust: 0.15,
  schemaVerified: 0.1
};

const BRAND_TRUST_SCORES: Record<string, number> = {
  'burberry.com': 0.95,
  'gucci.com': 0.95,
  'prada.com': 0.95,
  'nike.com': 0.9,
  'adidas.com': 0.9,
  'amazon.com': 0.8,
  'ebay.com': 0.7,
  'farfetch.com': 0.9,
  'ssense.com': 0.9,
  'matchesfashion.com': 0.9,
  'mrporter.com': 0.9,
  'net-a-porter.com': 0.9,
  'shopbop.com': 0.85,
  'revolve.com': 0.85,
  'asos.com': 0.8,
  'zara.com': 0.8,
  'h&m.com': 0.8,
  'uniqlo.com': 0.8
};

const PRICE_RANGES: Record<string, { min: number; max: number; currency: string }> = {
  'burberry': { min: 200, max: 5000, currency: 'USD' },
  'gucci': { min: 500, max: 10000, currency: 'USD' },
  'prada': { min: 500, max: 10000, currency: 'USD' },
  'louis vuitton': { min: 800, max: 15000, currency: 'USD' },
  'chanel': { min: 1000, max: 20000, currency: 'USD' },
  'ralph lauren': { min: 50, max: 500, currency: 'USD' },
  'tommy hilfiger': { min: 30, max: 300, currency: 'USD' },
  'calvin klein': { min: 25, max: 250, currency: 'USD' },
  'nike': { min: 20, max: 300, currency: 'USD' },
  'adidas': { min: 20, max: 300, currency: 'USD' },
  'puma': { min: 15, max: 200, currency: 'USD' },
  'levi\'s': { min: 20, max: 200, currency: 'USD' },
  'zara': { min: 15, max: 150, currency: 'USD' },
  'h&m': { min: 10, max: 100, currency: 'USD' },
  'uniqlo': { min: 15, max: 100, currency: 'USD' }
};

const CATEGORY_PRICE_MULTIPLIERS: Record<string, number> = {
  'shirt': 1.0,
  'top': 1.2,
  'outerwear': 1.5,
  'dress': 1.3,
  'bottoms': 1.1,
  'footwear': 1.4,
  'accessories': 0.8
};

export function calculateProductScore(
  result: SourceResult,
  attributes: VisionAttributes,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = 0;
  if (attributes.brandHints.length > 0 && result.title) {
    const brandMatchScore = calculateBrandMatch(result, attributes.brandHints);
    score += brandMatchScore * weights.brandMatch;
  }
  const categoryMatchScore = calculateCategoryMatch(result, attributes);
  score += categoryMatchScore * weights.categoryMatch;
  const colorMatchScore = calculateColorMatch(result, attributes.colors);
  score += colorMatchScore * weights.colorMatch;
  if (attributes.material) {
    const materialMatchScore = calculateMaterialMatch(result, attributes.material);
    score += materialMatchScore * weights.materialMatch;
  }
  if (result.price) {
    const priceScore = calculatePriceScore(result, attributes);
    score += priceScore * weights.priceReasonable;
  }
  const merchantScore = calculateMerchantTrust(result);
  score += merchantScore * weights.merchantTrust;
  if (result.verified) score += weights.schemaVerified;
  return Math.max(0, Math.min(1, score));
}

function calculateBrandMatch(result: SourceResult, brandHints: string[]): number {
  const title = result.title.toLowerCase();
  const merchant = result.merchant.toLowerCase();
  for (const brand of brandHints) {
    const brandLower = brand.toLowerCase();
    if (title.includes(brandLower)) return 1.0;
    if (merchant.includes(brandLower)) return 0.9;
    if (brandLower.includes(' ') && title.includes(brandLower.split(' ')[0])) return 0.7;
  }
  return 0.0;
}

function calculateCategoryMatch(result: SourceResult, attributes: VisionAttributes): number {
  const title = result.title.toLowerCase();
  const category = attributes.category.toLowerCase();
  if (title.includes(category)) return 1.0;
  const categoryVariations: Record<string, string[]> = {
    'shirt': ['shirt', 't-shirt', 'tshirt', 'polo', 'button-down'],
    'top': ['top', 'sweater', 'hoodie', 'sweatshirt', 'cardigan'],
    'outerwear': ['jacket', 'coat', 'blazer', 'outerwear'],
    'dress': ['dress', 'gown'],
    'bottoms': ['pants', 'jeans', 'trousers', 'shorts', 'skirt'],
    'footwear': ['shoes', 'sneakers', 'boots', 'footwear'],
    'accessories': ['bag', 'handbag', 'purse', 'wallet', 'accessories']
  };
  const variations = categoryVariations[category];
  if (variations) {
    for (const variation of variations) {
      if (title.includes(variation)) return 0.8;
    }
  }
  return 0.0;
}

function calculateColorMatch(result: SourceResult, colors: string[]): number {
  if (colors.length === 0) return 0.0;
  const title = result.title.toLowerCase();
  let maxScore = 0.0;
  for (const color of colors) {
    if (title.includes(color.toLowerCase())) maxScore = Math.max(maxScore, 1.0);
    const colorVariations: Record<string, string[]> = {
      'white': ['white', 'ivory', 'cream', 'off-white'],
      'black': ['black', 'charcoal', 'onyx'],
      'blue': ['blue', 'navy', 'azure', 'cobalt'],
      'red': ['red', 'burgundy', 'maroon', 'crimson'],
      'green': ['green', 'emerald', 'forest', 'olive'],
      'brown': ['brown', 'chocolate', 'camel', 'tan'],
      'beige': ['beige', 'tan', 'khaki', 'cream']
    };
    const variations = colorVariations[color];
    if (variations) {
      for (const variation of variations) {
        if (title.includes(variation)) maxScore = Math.max(maxScore, 0.8);
      }
    }
  }
  return maxScore;
}

function calculateMaterialMatch(result: SourceResult, material: string): number {
  const title = result.title.toLowerCase();
  const materialLower = material.toLowerCase();
  if (title.includes(materialLower)) return 1.0;
  const materialVariations: Record<string, string[]> = {
    'cotton': ['cotton', 'cotton blend'],
    'wool': ['wool', 'wool blend', 'merino'],
    'leather': ['leather', 'genuine leather', 'faux leather'],
    'denim': ['denim', 'jeans material'],
    'silk': ['silk', 'silk blend'],
    'polyester': ['polyester', 'poly blend']
  };
  const variations = materialVariations[materialLower];
  if (variations) {
    for (const variation of variations) {
      if (title.includes(variation)) return 0.8;
    }
  }
  return 0.0;
}

function calculatePriceScore(result: SourceResult, attributes: VisionAttributes): number {
  if (!result.price) return 0.0;
  const { amount, currency } = result.price;
  const primaryBrand = attributes.brandHints[0];
  if (!primaryBrand) return 0.5;
  const priceRange = PRICE_RANGES[primaryBrand.toLowerCase()];
  if (!priceRange) return 0.5;
  let normalizedAmount = amount;
  if (currency === 'EUR') normalizedAmount = amount * 1.1;
  else if (currency === 'GBP') normalizedAmount = amount * 1.3;
  const { min, max } = priceRange;
  const categoryMultiplier = CATEGORY_PRICE_MULTIPLIERS[attributes.category] || 1.0;
  const adjustedMin = min * categoryMultiplier;
  const adjustedMax = max * categoryMultiplier;
  if (normalizedAmount >= adjustedMin && normalizedAmount <= adjustedMax) return 1.0;
  if (normalizedAmount >= adjustedMin * 0.5 && normalizedAmount <= adjustedMax * 1.5) return 0.7;
  if (normalizedAmount >= adjustedMin * 0.3 && normalizedAmount <= adjustedMax * 2.0) return 0.4;
  return 0.1;
}

function calculateMerchantTrust(result: SourceResult): number {
  const domain = extractDomain(result.url);
  return BRAND_TRUST_SCORES[domain] || 0.5;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

export function rankResults(results: SourceResult[], attributes: VisionAttributes): SourceResult[] {
  return results
    .map(result => ({ ...result, score: calculateProductScore(result, attributes) }))
    .sort((a, b) => {
      if (a.verified !== b.verified) return b.verified ? 1 : -1;
      if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score;
      if (a.price && b.price) return a.price.amount - b.price.amount;
      return 0;
    });
}

export function calculateMetrics(results: SourceResult[]): {
  verifiedRate: number;
  meanScore: number;
  totalResults: number;
  verifiedCount: number;
} {
  if (results.length === 0) return { verifiedRate: 0, meanScore: 0, totalResults: 0, verifiedCount: 0 };
  const verifiedCount = results.filter(r => r.verified).length;
  const verifiedRate = verifiedCount / results.length;
  const meanScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  return { verifiedRate, meanScore, totalResults: results.length, verifiedCount };
}


