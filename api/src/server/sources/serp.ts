import { Source, SourceResult, SearchOptions } from '../../shared/types';

export class SerpAPISource implements Source {
  name = 'SerpAPI (Google Shopping)';
  private apiKey: string | null = null;

  constructor() {
    // TODO(env): Set SERPAPI_KEY in .env
    this.apiKey = process.env.SERPAPI_KEY || null;
  }

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey) {
      console.warn('SerpAPI key not configured, skipping search');
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      const response = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${opts.limit}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.shopping_results) {
        return [];
      }

      return data.shopping_results.map((item: any, index: number) => ({
        id: `serp-${index}`,
        title: item.title || 'Unknown Product',
        url: item.link || '',
        price: item.price ? {
          amount: parseFloat(item.price.replace(/[^0-9.]/g, '')),
          currency: 'USD'
        } : undefined,
        merchant: item.source || 'Unknown Merchant',
        thumbnail: item.thumbnail || '',
        attributes: {
          source: 'google_shopping',
          rating: item.rating,
          reviews: item.reviews
        },
        score: 0.7, // Base score, will be recalculated
        verified: false // Will be validated separately
      }));

    } catch (error) {
      console.error('SerpAPI search error:', error);
      return [];
    }
  }
}
