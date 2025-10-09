import { Source, SourceResult, SearchOptions } from '../../../shared/types';

export const mockSources: Source[] = [
  {
    name: 'Mock Store 1',
    async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      return [
        {
          id: 'mock-123',
          title: `${query} - Blue Cotton T-Shirt`,
          url: 'https://mock-store-1.com/product/123',
          price: { amount: 24.99, currency: 'USD' },
          thumbnail: 'https://via.placeholder.com/300x300/4A90E2/FFFFFF?text=Mock+Product',
          merchant: 'Mock Store 1',
          attributes: {
            brand: 'MockBrand',
            category: 'clothing',
            color: 'blue',
            material: 'cotton',
            description: `High-quality ${query} made from premium cotton. Perfect for casual wear.`
          },
          score: 0.85,
          verified: true
        },
        {
          id: 'mock-124',
          title: `${query} - Black Denim Jacket`,
          url: 'https://mock-store-1.com/product/124',
          price: { amount: 89.99, currency: 'USD' },
          thumbnail: 'https://via.placeholder.com/300x300/333333/FFFFFF?text=Mock+Jacket',
          merchant: 'Mock Store 1',
          attributes: {
            brand: 'MockBrand',
            category: 'clothing',
            color: 'black',
            material: 'denim',
            description: `Classic ${query} in black denim. Durable and stylish.`
          },
          score: 0.78,
          verified: true
        }
      ].slice(0, opts.limit || 2);
    }
  },
  {
    name: 'Mock Store 2',
    async search(query: string, opts: SearchOptions): Promise<SourceResult[]> {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
      
      return [
        {
          id: 'mock-456',
          title: `${query} - White Summer Dress`,
          url: 'https://mock-store-2.com/product/456',
          price: { amount: 65.00, currency: 'USD' },
          thumbnail: 'https://via.placeholder.com/300x300/FFFFFF/333333?text=Mock+Dress',
          merchant: 'Mock Store 2',
          attributes: {
            brand: 'FashionMock',
            category: 'clothing',
            color: 'white',
            material: 'cotton',
            description: `Elegant ${query} perfect for summer occasions.`
          },
          score: 0.72,
          verified: false
        }
      ].slice(0, opts.limit || 1);
    }
  }
];
