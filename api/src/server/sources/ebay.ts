import { Source, SourceResult, SearchOptions } from '../../shared/types';

export class eBaySource implements Source {
  name = 'eBay Browse API';
  private appId: string | null = null;

  constructor() {
    // TODO(env): Set EBAY_APP_ID in .env
    this.appId = process.env.EBAY_APP_ID || null;
  }

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    if (!this.appId) {
      console.warn('eBay App ID not configured, skipping search');
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      // eBay Browse API endpoint
      const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${opts.limit}&filter=conditions:{NEW|USED_EXCELLENT|USED_VERY_GOOD}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.appId}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`eBay API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.itemSummaries) {
        return [];
      }

      return data.itemSummaries.map((item: any) => ({
        id: `ebay-${item.itemId}`,
        title: item.title || 'Unknown Product',
        url: item.itemWebUrl || '',
        price: item.price ? {
          amount: parseFloat(item.price.value),
          currency: item.price.currency || 'USD'
        } : undefined,
        merchant: item.seller.username || 'eBay Seller',
        thumbnail: item.image?.imageUrl || '',
        attributes: {
          source: 'ebay',
          condition: item.condition,
          location: item.itemLocation?.city,
          shipping: item.shippingOptions?.[0]?.shippingCost?.value
        },
        score: 0.8, // Base score, will be recalculated
        verified: false // Will be validated separately
      }));

    } catch (error) {
      console.error('eBay search error:', error);
      return [];
    }
  }
}
