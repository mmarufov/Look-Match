import { Source, SourceResult, SearchOptions } from '../../../shared/types';

export { mockSources } from './mock';

export class SerpAPISource implements Source {
  name = 'SerpAPI (Google Shopping)';
  private apiKey: string | null = process.env.SERPAPI_KEY || null;
  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey) { console.warn('SerpAPI key not configured, skipping search'); return []; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
      const response = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${opts.limit}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`SerpAPI error: ${response.status}`);
      const data = await response.json();
      if (!data.shopping_results) return [];
      return data.shopping_results.map((item: any, index: number) => ({
        id: `serp-${index}`,
        title: item.title || 'Unknown Product',
        url: item.link || '',
        price: item.price ? { amount: parseFloat(item.price.replace(/[^0-9.]/g, '')), currency: 'USD' } : undefined,
        merchant: item.source || 'Unknown Merchant',
        thumbnail: item.thumbnail || '',
        attributes: { source: 'google_shopping', rating: item.rating, reviews: item.reviews },
        score: 0.7,
        verified: false
      }));
    } catch (e) { console.error('SerpAPI search error:', e); return []; }
  }
}

export class eBaySource implements Source {
  name = 'eBay Browse API';
  private appId: string | null = process.env.EBAY_APP_ID || null;
  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.appId) { console.warn('eBay App ID not configured, skipping search'); return []; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
      const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${opts.limit}&filter=conditions:{NEW|USED_EXCELLENT|USED_VERY_GOOD}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.appId}`, 'Content-Type': 'application/json', 'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US' }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`eBay API error: ${response.status}`);
      const data = await response.json();
      if (!data.itemSummaries) return [];
      return data.itemSummaries.map((item: any) => ({
        id: `ebay-${item.itemId}`,
        title: item.title || 'Unknown Product',
        url: item.itemWebUrl || '',
        price: item.price ? { amount: parseFloat(item.price.value), currency: item.price.currency || 'USD' } : undefined,
        merchant: item.seller.username || 'eBay Seller',
        thumbnail: item.image?.imageUrl || '',
        attributes: { source: 'ebay', condition: item.condition, location: item.itemLocation?.city, shipping: item.shippingOptions?.[0]?.shippingCost?.value },
        score: 0.8,
        verified: false
      }));
    } catch (e) { console.error('eBay search error:', e); return []; }
  }
}

export class BingSource implements Source {
  name = 'Bing Web Search';
  private apiKey: string | null = process.env.BING_API_KEY || process.env.BING_SUBSCRIPTION_KEY || null;
  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey) { console.warn('Bing key not configured, skipping search'); return []; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&responseFilter=Webpages&count=${opts.limit}`;
      const response = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Bing API error: ${response.status}`);
      const data = await response.json();
      const items = data.webPages?.value || [];
      return items.map((item: any, index: number) => ({
        id: `bing-${index}`,
        title: item.name || 'Unknown Product',
        url: item.url || '',
        merchant: new URL(item.url || 'https://example.com').hostname.replace(/^www\./, ''),
        thumbnail: undefined,
        attributes: { snippet: item.snippet, source: 'bing_web' },
        score: 0.5, verified: false
      }));
    } catch (e) { console.error('Bing search error:', e); return []; }
  }
}

export class AliExpressSource implements Source {
  name = 'AliExpress (RapidAPI)';
  private apiKey: string | null = process.env.ALIEXPRESS_RAPIDAPI_KEY || null;
  private host: string | null = process.env.ALIEXPRESS_RAPIDAPI_HOST || null;
  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey || !this.host) { console.warn('AliExpress RapidAPI not configured, skipping search'); return []; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
      const url = `https://${this.host}/products/search?query=${encodeURIComponent(query)}&page=1&limit=${opts.limit}`;
      const response = await fetch(url, { headers: { 'X-RapidAPI-Key': this.apiKey, 'X-RapidAPI-Host': this.host }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`AliExpress RapidAPI error: ${response.status}`);
      const data: any = await response.json();
      const items = Array.isArray(data.items) ? data.items : (data.data || []);
      return (items || []).slice(0, opts.limit).map((item: any, index: number) => ({
        id: `aliexpress-${item.product_id || index}`,
        title: item.title || item.name || 'Unknown Product',
        url: item.product_url || item.url || '',
        price: item.price ? { amount: parseFloat(String(item.price).replace(/[^0-9.]/g, '')), currency: 'USD' } : undefined,
        merchant: 'AliExpress',
        thumbnail: item.thumbnail || item.image || '',
        attributes: { source: 'aliexpress' },
        score: 0.4, verified: false
      }));
    } catch (e) { console.error('AliExpress search error:', e); return []; }
  }
}


