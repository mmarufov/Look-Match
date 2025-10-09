import { ValidationResult } from '../../../shared/types';

const MERCHANT_PATTERNS: Record<string, {
  productIndicators: string[];
  searchIndicators: string[];
  brandKeywords: string[];
}> = {
  'burberry.com': { productIndicators: ['add to bag','add to cart','buy now','product-detail'], searchIndicators: ['search','results','?q=','?search'], brandKeywords: ['burberry','london'] },
  'gucci.com': { productIndicators: ['add to bag','add to cart','buy now','product-detail'], searchIndicators: ['search','results','?q=','?search'], brandKeywords: ['gucci','italy'] },
  'nike.com': { productIndicators: ['add to cart','buy now','product-detail','pdp'], searchIndicators: ['search','results','?q=','?search'], brandKeywords: ['nike','swoosh'] },
  'amazon.com': { productIndicators: ['add to cart','buy now','product-detail','/dp/'], searchIndicators: ['search','results','?k=','?q='], brandKeywords: [] },
  'ebay.com': { productIndicators: ['add to cart','buy it now','item','/itm/'], searchIndicators: ['search','results','?rt=nc'], brandKeywords: [] },
  'farfetch.com': { productIndicators: ['add to bag','buy now','product-detail'], searchIndicators: ['search','results','?q=','?search'], brandKeywords: [] },
  'ssense.com': { productIndicators: ['add to cart','buy now','product-detail'], searchIndicators: ['search','results','?q=','?search'], brandKeywords: [] }
};

const REJECT_PATTERNS = [ /\?q=/i, /\?search/i, /\?k=/i, /\/search/i, /\/results/i, /\/s\?k=/i, /\/search\?/i, /\/home/i, /\/index/i, /\/category/i, /\/collections/i ];
const PRODUCT_INDICATORS = ['add to bag','add to cart','buy now','purchase','product-detail','pdp','/dp/','/itm/','item','product'];
const SCHEMA_INDICATORS = ['"@type":"Product"','og:type" content="product"','product:price:amount','product:price:currency'];

export async function validateProductUrl(url: string, expectedBrand?: string, expectedCategory?: string): Promise<ValidationResult> {
  try {
    const normalizedUrl = normalizeUrl(url);
    if (isRejectedUrl(normalizedUrl)) return { verified: false, reason: 'URL contains search or category patterns' };
    const domain = extractDomain(normalizedUrl);
    const response = await fetch(normalizedUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LookMatch/1.0)' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { verified: false, reason: `HTTP ${response.status}: ${response.statusText}` };
    const html = await response.text();
    const finalUrl = response.url;
    if (!isProductPage(html)) return { verified: false, reason: 'Page does not contain product indicators' };
    if (!hasProductSchema(html)) return { verified: false, reason: 'Page does not contain product schema markup' };
    const contentValidation = validateContent(html, expectedBrand, expectedCategory, domain);
    if (!contentValidation.valid) return { verified: false, reason: contentValidation.reason } as any;
    if (expectedBrand && isLuxuryBrand(expectedBrand)) {
      const luxuryValidation = validateLuxuryBrand(html, expectedBrand, domain);
      if (!luxuryValidation.valid) return { verified: false, reason: luxuryValidation.reason } as any;
    }
    return { verified: true, finalUrl };
  } catch (error) {
    return { verified: false, reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','source'];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    urlObj.hostname = urlObj.hostname.toLowerCase();
    if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') urlObj.pathname = urlObj.pathname.slice(0, -1);
    return urlObj.toString();
  } catch { return url; }
}
function extractDomain(url: string): string { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } }
function isRejectedUrl(url: string): boolean { return REJECT_PATTERNS.some(pattern => pattern.test(url)); }
function isProductPage(html: string): boolean { const lower = html.toLowerCase(); return PRODUCT_INDICATORS.some(ind => lower.includes(ind)); }
function hasProductSchema(html: string): boolean { return SCHEMA_INDICATORS.some(ind => html.includes(ind)); }
function validateContent(html: string, expectedBrand?: string, expectedCategory?: string, domain?: string): { valid: boolean; reason?: string } {
  const lowerHtml = html.toLowerCase();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    if (expectedBrand && isLuxuryBrand(expectedBrand)) {
      if (!title.includes(expectedBrand.toLowerCase())) return { valid: false, reason: `Title does not contain expected brand: ${expectedBrand}` };
    }
    if (expectedCategory && !title.includes(expectedCategory.toLowerCase())) return { valid: false, reason: `Title does not contain expected category: ${expectedCategory}` };
  }
  if (!lowerHtml.includes('price') && !lowerHtml.includes('$') && !lowerHtml.includes('€') && !lowerHtml.includes('£')) return { valid: false, reason: 'Page does not contain price information' };
  return { valid: true };
}
function isLuxuryBrand(brand: string): boolean { const luxury = ['burberry','gucci','prada','louis vuitton','chanel','hermes','fendi','balenciaga']; return luxury.includes(brand.toLowerCase()); }
function validateLuxuryBrand(html: string, expectedBrand: string, domain: string): { valid: boolean; reason?: string } {
  const lowerHtml = html.toLowerCase();
  const brandLower = expectedBrand.toLowerCase();
  if (!lowerHtml.includes(brandLower)) return { valid: false, reason: `Luxury brand ${expectedBrand} not found in page content` };
  const merchantPatterns = MERCHANT_PATTERNS[domain];
  if (merchantPatterns) {
    const hasBrandKeyword = merchantPatterns.brandKeywords.some(k => lowerHtml.includes(k.toLowerCase()));
    if (!hasBrandKeyword) return { valid: false, reason: `Page does not contain expected brand keywords for ${domain}` };
  }
  return { valid: true };
}

export async function validateProductUrls(urls: string[], expectedBrand?: string, expectedCategory?: string): Promise<ValidationResult[]> {
  const results = await Promise.allSettled(urls.map(url => validateProductUrl(url, expectedBrand, expectedCategory)));
  return results.map(r => r.status === 'fulfilled' ? r.value : { verified: false, reason: `Validation failed: ${r.reason}` });
}


