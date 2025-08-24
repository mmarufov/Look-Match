import { ValidationResult } from '../../shared/types';

// Known merchant domains and their validation patterns
const MERCHANT_PATTERNS: Record<string, {
  productIndicators: string[];
  searchIndicators: string[];
  brandKeywords: string[];
}> = {
  'burberry.com': {
    productIndicators: ['add to bag', 'add to cart', 'buy now', 'product-detail'],
    searchIndicators: ['search', 'results', '?q=', '?search'],
    brandKeywords: ['burberry', 'london']
  },
  'gucci.com': {
    productIndicators: ['add to bag', 'add to cart', 'buy now', 'product-detail'],
    searchIndicators: ['search', 'results', '?q=', '?search'],
    brandKeywords: ['gucci', 'italy']
  },
  'nike.com': {
    productIndicators: ['add to cart', 'buy now', 'product-detail', 'pdp'],
    searchIndicators: ['search', 'results', '?q=', '?search'],
    brandKeywords: ['nike', 'swoosh']
  },
  'amazon.com': {
    productIndicators: ['add to cart', 'buy now', 'product-detail', '/dp/'],
    searchIndicators: ['search', 'results', '?k=', '?q='],
    brandKeywords: []
  },
  'ebay.com': {
    productIndicators: ['add to cart', 'buy it now', 'item', '/itm/'],
    searchIndicators: ['search', 'results', '?rt=nc'],
    brandKeywords: []
  },
  'farfetch.com': {
    productIndicators: ['add to bag', 'buy now', 'product-detail'],
    searchIndicators: ['search', 'results', '?q=', '?search'],
    brandKeywords: []
  },
  'ssense.com': {
    productIndicators: ['add to cart', 'buy now', 'product-detail'],
    searchIndicators: ['search', 'results', '?q=', '?search'],
    brandKeywords: []
  }
};

// Reject patterns that indicate search or home pages
const REJECT_PATTERNS = [
  /\?q=/i,
  /\?search/i,
  /\?k=/i,
  /\/search/i,
  /\/results/i,
  /\/s\?k=/i,
  /\/search\?/i,
  /\/home/i,
  /\/index/i,
  /\/category/i,
  /\/collections/i
];

// Product page indicators
const PRODUCT_INDICATORS = [
  'add to bag',
  'add to cart',
  'buy now',
  'purchase',
  'product-detail',
  'pdp',
  '/dp/',
  '/itm/',
  'item',
  'product'
];

// Schema.org product indicators
const SCHEMA_INDICATORS = [
  '"@type":"Product"',
  'og:type" content="product"',
  'product:price:amount',
  'product:price:currency'
];

export async function validateProductUrl(
  url: string, 
  expectedBrand?: string,
  expectedCategory?: string
): Promise<ValidationResult> {
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    // Check for obvious reject patterns
    if (isRejectedUrl(normalizedUrl)) {
      return {
        verified: false,
        reason: 'URL contains search or category patterns'
      };
    }
    
    // Extract domain for merchant-specific validation
    const domain = extractDomain(normalizedUrl);
    const merchantPatterns = MERCHANT_PATTERNS[domain];
    
    // Fetch the page content
    const response = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LookMatch/1.0)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      return {
        verified: false,
        reason: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const html = await response.text();
    const finalUrl = response.url; // Handle redirects
    
    // Check if it's a product page
    if (!isProductPage(html)) {
      return {
        verified: false,
        reason: 'Page does not contain product indicators'
      };
    }
    
    // Check for schema.org product markup
    if (!hasProductSchema(html)) {
      return {
        verified: false,
        reason: 'Page does not contain product schema markup'
      };
    }
    
    // Validate content matches expected attributes
    const contentValidation = validateContent(
      html, 
      expectedBrand, 
      expectedCategory, 
      domain
    );
    
    if (!contentValidation.valid) {
      return {
        verified: false,
        reason: contentValidation.reason
      };
    }
    
    // Special validation for luxury brands
    if (expectedBrand && isLuxuryBrand(expectedBrand)) {
      const luxuryValidation = validateLuxuryBrand(html, expectedBrand, domain);
      if (!luxuryValidation.valid) {
        return {
          verified: false,
          reason: luxuryValidation.reason
        };
      }
    }
    
    return {
      verified: true,
      finalUrl
    };
    
  } catch (error) {
    return {
      verified: false,
      reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    
    // Normalize hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove trailing slash
    if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isRejectedUrl(url: string): boolean {
  return REJECT_PATTERNS.some(pattern => pattern.test(url));
}

function isProductPage(html: string): boolean {
  const lowerHtml = html.toLowerCase();
  return PRODUCT_INDICATORS.some(indicator => lowerHtml.includes(indicator));
}

function hasProductSchema(html: string): boolean {
  return SCHEMA_INDICATORS.some(indicator => html.includes(indicator));
}

function validateContent(
  html: string, 
  expectedBrand?: string, 
  expectedCategory?: string,
  domain?: string
): { valid: boolean; reason?: string } {
  const lowerHtml = html.toLowerCase();
  
  // Check title contains relevant information
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    
    // For luxury brands, ensure brand is in title
    if (expectedBrand && isLuxuryBrand(expectedBrand)) {
      if (!title.includes(expectedBrand.toLowerCase())) {
        return {
          valid: false,
          reason: `Title does not contain expected brand: ${expectedBrand}`
        };
      }
    }
    
    // Check for category keywords
    if (expectedCategory && !title.includes(expectedCategory.toLowerCase())) {
      return {
        valid: false,
        reason: `Title does not contain expected category: ${expectedCategory}`
      };
    }
  }
  
  // Check for product-specific content
  if (!lowerHtml.includes('price') && !lowerHtml.includes('$') && !lowerHtml.includes('€') && !lowerHtml.includes('£')) {
    return {
      valid: false,
      reason: 'Page does not contain price information'
    };
  }
  
  return { valid: true };
}

function isLuxuryBrand(brand: string): boolean {
  const luxuryBrands = ['burberry', 'gucci', 'prada', 'louis vuitton', 'chanel', 'hermes', 'fendi', 'balenciaga'];
  return luxuryBrands.includes(brand.toLowerCase());
}

function validateLuxuryBrand(
  html: string, 
  expectedBrand: string, 
  domain: string
): { valid: boolean; reason?: string } {
  const lowerHtml = html.toLowerCase();
  const brandLower = expectedBrand.toLowerCase();
  
  // Check if brand appears in content
  if (!lowerHtml.includes(brandLower)) {
    return {
      valid: false,
      reason: `Luxury brand ${expectedBrand} not found in page content`
    };
  }
  
  // Check for merchant-specific brand validation
  const merchantPatterns = MERCHANT_PATTERNS[domain];
  if (merchantPatterns) {
    const brandKeywords = merchantPatterns.brandKeywords;
    if (brandKeywords.length > 0) {
      const hasBrandKeyword = brandKeywords.some(keyword => lowerHtml.includes(keyword.toLowerCase()));
      if (!hasBrandKeyword) {
        return {
          valid: false,
          reason: `Page does not contain expected brand keywords for ${domain}`
        };
      }
    }
  }
  
  return { valid: true };
}

// Batch validation for multiple URLs
export async function validateProductUrls(
  urls: string[], 
  expectedBrand?: string, 
  expectedCategory?: string
): Promise<ValidationResult[]> {
  const results = await Promise.allSettled(
    urls.map(url => validateProductUrl(url, expectedBrand, expectedCategory))
  );
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        verified: false,
        reason: `Validation failed: ${result.reason}`
      };
    }
  });
}
