import { Source, SourceResult, SearchOptions } from '../../shared/types';

export class BingSource implements Source {
  name = 'Bing Web Search';
  private apiKey: string | null = null;

  constructor() {
    // TODO(env): Set BING_API_KEY or BING_SUBSCRIPTION_KEY in .env
    this.apiKey = process.env.BING_API_KEY || process.env.BING_SUBSCRIPTION_KEY || null;
  }

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.apiKey) {
      console.warn('Bing key not configured, skipping search');
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&responseFilter=Webpages&count=${opts.limit}`;
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.webPages?.value || [];

      return items.map((item: any, index: number) => ({
        id: `bing-${index}`,
        title: item.name || 'Unknown Product',
        url: item.url || '',
        merchant: new URL(item.url || 'https://example.com').hostname.replace(/^www\./, ''),
        thumbnail: undefined,
        attributes: {
          snippet: item.snippet,
          source: 'bing_web'
        },
        score: 0.5,
        verified: false
      }));

    } catch (error) {
      console.error('Bing search error:', error);
      return [];
    }
  }
}


