import { Source, SourceResult, SearchOptions } from '../../shared/types';

// Optional AliExpress via RapidAPI (placeholder implementation)
export class AliExpressSource implements Source {
  name = 'AliExpress (RapidAPI)';
  private apiKey: string | null = null;
  private host: string | null = null;

  constructor() {
    this.apiKey = process.env.ALIEXPRESS_RAPIDAPI_KEY || null;
    // NOTE: Different RapidAPI providers exist; set the host via env if needed
    this.host = process.env.ALIEXPRESS_RAPIDAPI_HOST || null;
  }

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey || !this.host) {
      console.warn('AliExpress RapidAPI not configured, skipping search');
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      // Example endpoint shape; may vary by provider. Expose HOST via env.
      const url = `https://${this.host}/products/search?query=${encodeURIComponent(query)}&page=1&limit=${opts.limit}`;
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AliExpress RapidAPI error: ${response.status}`);
      }

      const data: any = await response.json();
      const items = Array.isArray(data.items) ? data.items : (data.data || []);

      return (items || []).slice(0, opts.limit).map((item: any, index: number) => ({
        id: `aliexpress-${item.product_id || index}`,
        title: item.title || item.name || 'Unknown Product',
        url: item.product_url || item.url || '',
        price: item.price ? {
          amount: parseFloat(String(item.price).replace(/[^0-9.]/g, '')),
          currency: 'USD'
        } : undefined,
        merchant: 'AliExpress',
        thumbnail: item.thumbnail || item.image || '',
        attributes: { source: 'aliexpress' },
        score: 0.4,
        verified: false
      }));

    } catch (error) {
      console.error('AliExpress search error:', error);
      return [];
    }
  }
}


