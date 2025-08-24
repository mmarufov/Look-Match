import { Source, SourceResult, SearchOptions } from '../../shared/types';

// Mock product data for testing
const MOCK_PRODUCTS: Record<string, SourceResult[]> = {
  'burberry shirt beige': [
    {
      id: 'burberry-1',
      title: 'Burberry London Heritage Check Cotton Shirt',
      url: 'https://www.burberry.com/us/en/london-collection/london-heritage-check-cotton-shirt-p80445651',
      price: { amount: 450, currency: 'USD' },
      merchant: 'Burberry',
      thumbnail: 'https://example.com/burberry-shirt.jpg',
      attributes: { brand: 'Burberry', category: 'shirt', color: 'beige', material: 'cotton' },
      score: 0.95,
      verified: true
    },
    {
      id: 'farfetch-1',
      title: 'Burberry London Heritage Check Cotton Shirt',
      url: 'https://www.farfetch.com/shopping/women/burberry-london-heritage-check-cotton-shirt-item-12345678.aspx',
      price: { amount: 425, currency: 'USD' },
      merchant: 'Farfetch',
      thumbnail: 'https://example.com/burberry-shirt-farfetch.jpg',
      attributes: { brand: 'Burberry', category: 'shirt', color: 'beige', material: 'cotton' },
      score: 0.9,
      verified: true
    }
  ],
  'nike hoodie black': [
    {
      id: 'nike-1',
      title: 'Nike Sportswear Club Fleece Hoodie',
      url: 'https://www.nike.com/t/sportswear-club-fleece-hoodie-123456',
      price: { amount: 65, currency: 'USD' },
      merchant: 'Nike',
      thumbnail: 'https://example.com/nike-hoodie.jpg',
      attributes: { brand: 'Nike', category: 'hoodie', color: 'black', material: 'fleece' },
      score: 0.92,
      verified: true
    },
    {
      id: 'footlocker-1',
      title: 'Nike Sportswear Club Fleece Hoodie',
      url: 'https://www.footlocker.com/product/nike-sportswear-club-fleece-hoodie/123456.html',
      price: { amount: 60, currency: 'USD' },
      merchant: 'Foot Locker',
      thumbnail: 'https://example.com/nike-hoodie-footlocker.jpg',
      attributes: { brand: 'Nike', category: 'hoodie', color: 'black', material: 'fleece' },
      score: 0.88,
      verified: true
    }
  ],
  'dress blue': [
    {
      id: 'zara-1',
      title: 'Zara Blue Cotton Dress',
      url: 'https://www.zara.com/us/en/blue-cotton-dress-p12345678.html',
      price: { amount: 45, currency: 'USD' },
      merchant: 'Zara',
      thumbnail: 'https://example.com/zara-dress.jpg',
      attributes: { brand: 'Zara', category: 'dress', color: 'blue', material: 'cotton' },
      score: 0.85,
      verified: true
    },
    {
      id: 'asos-1',
      title: 'ASOS Blue Cotton Midi Dress',
      url: 'https://www.asos.com/us/asos-design/asos-design-blue-cotton-midi-dress/prd/12345678',
      price: { amount: 38, currency: 'USD' },
      merchant: 'ASOS',
      thumbnail: 'https://example.com/asos-dress.jpg',
      attributes: { brand: 'ASOS', category: 'dress', color: 'blue', material: 'cotton' },
      score: 0.82,
      verified: true
    }
  ]
};

export class MockSource implements Source {
  name = 'Mock Source';

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Find matching mock products
    const queryLower = query.toLowerCase();
    let results: SourceResult[] = [];
    
    for (const [key, products] of Object.entries(MOCK_PRODUCTS)) {
      if (key.includes(queryLower) || queryLower.includes(key)) {
        results.push(...products);
      }
    }
    
    // If no exact match, return some generic results
    if (results.length === 0) {
      results = [
        {
          id: 'generic-1',
          title: `Generic ${query} Product`,
          url: `https://example.com/product/${encodeURIComponent(query)}`,
          price: { amount: 50, currency: 'USD' },
          merchant: 'Generic Store',
          thumbnail: 'https://example.com/generic.jpg',
          attributes: { category: 'clothing' },
          score: 0.5,
          verified: false
        }
      ];
    }
    
    // Limit results
    return results.slice(0, opts.limit);
  }
}

// Mock source for luxury brands
export class MockLuxurySource implements Source {
  name = 'Mock Luxury Source';

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('burberry')) {
      return [
        {
          id: 'burberry-luxury-1',
          title: 'Burberry London Heritage Check Cotton Shirt',
          url: 'https://www.burberry.com/us/en/london-collection/london-heritage-check-cotton-shirt-p80445651',
          price: { amount: 450, currency: 'USD' },
          merchant: 'Burberry',
          thumbnail: 'https://example.com/burberry-luxury.jpg',
          attributes: { brand: 'Burberry', category: 'shirt', color: 'beige', material: 'cotton' },
          score: 0.98,
          verified: true
        },
        {
          id: 'matchesfashion-1',
          title: 'Burberry London Heritage Check Cotton Shirt',
          url: 'https://www.matchesfashion.com/us/products/Burberry-London-heritage-check-cotton-shirt-123456',
          price: { amount: 440, currency: 'USD' },
          merchant: 'Matches Fashion',
          thumbnail: 'https://example.com/burberry-matches.jpg',
          attributes: { brand: 'Burberry', category: 'shirt', color: 'beige', material: 'cotton' },
          score: 0.95,
          verified: true
        }
      ];
    }
    
    if (queryLower.includes('gucci')) {
      return [
        {
          id: 'gucci-luxury-1',
          title: 'Gucci Cotton Shirt',
          url: 'https://www.gucci.com/us/en/pr/women/ready-to-wear-for-women/ready-to-wear-for-women/ready-to-wear-shorts-for-women/gucci-cotton-shirt-p-12345678',
          price: { amount: 890, currency: 'USD' },
          merchant: 'Gucci',
          thumbnail: 'https://example.com/gucci-luxury.jpg',
          attributes: { brand: 'Gucci', category: 'shirt', material: 'cotton' },
          score: 0.98,
          verified: true
        }
      ];
    }
    
    return [];
  }
}

// Mock source for sportswear
export class MockSportswearSource implements Source {
  name = 'Mock Sportswear Source';

  async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150));
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('nike')) {
      return [
        {
          id: 'nike-sport-1',
          title: 'Nike Sportswear Club Fleece Hoodie',
          url: 'https://www.nike.com/t/sportswear-club-fleece-hoodie-123456',
          price: { amount: 65, currency: 'USD' },
          merchant: 'Nike',
          thumbnail: 'https://example.com/nike-sport.jpg',
          attributes: { brand: 'Nike', category: 'hoodie', color: 'black', material: 'fleece' },
          score: 0.95,
          verified: true
        },
        {
          id: 'footlocker-sport-1',
          title: 'Nike Sportswear Club Fleece Hoodie',
          url: 'https://www.footlocker.com/product/nike-sportswear-club-fleece-hoodie/123456.html',
          price: { amount: 60, currency: 'USD' },
          merchant: 'Foot Locker',
          thumbnail: 'https://example.com/nike-footlocker.jpg',
          attributes: { brand: 'Nike', category: 'hoodie', color: 'black', material: 'fleece' },
          score: 0.9,
          verified: true
        }
      ];
    }
    
    if (queryLower.includes('adidas')) {
      return [
        {
          id: 'adidas-sport-1',
          title: 'Adidas Originals Trefoil Hoodie',
          url: 'https://www.adidas.com/us/adidas-originals-trefoil-hoodie-123456.html',
          price: { amount: 55, currency: 'USD' },
          merchant: 'Adidas',
          thumbnail: 'https://example.com/adidas-sport.jpg',
          attributes: { brand: 'Adidas', category: 'hoodie', color: 'black', material: 'cotton' },
          score: 0.92,
          verified: true
        }
      ];
    }
    
    return [];
  }
}

// Export all mock sources
export const mockSources = [
  new MockSource(),
  new MockLuxurySource(),
  new MockSportswearSource()
];
