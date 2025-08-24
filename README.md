# LookMatch - Visual Detect + Real Links

A production-ready AI-powered clothing detection and product search platform that provides accurate product descriptions and verified purchase links.

## 🚀 Features

- **Advanced AI Vision Analysis**: Google Vision API integration for precise clothing detection
- **Deterministic Attribute Normalization**: Robust product description generation
- **Multi-Source Product Lookup**: Google Shopping, eBay, and more
- **URL Validation**: Guarantees links point to actual product pages
- **Smart Scoring & Ranking**: Combines attribute match quality, price, and retailer trust
- **Real-Time Verification**: Schema.org validation and content checks

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
- **Vision Processing**: Google Vision API with attribute normalization
- **Search Engine**: Multi-source product lookup with concurrency control
- **URL Validator**: Content verification and schema validation
- **Caching**: LRU cache with Redis support
- **Scoring System**: Intelligent ranking based on multiple factors

### Frontend (React + TypeScript + Tailwind)
- **Upload Interface**: Drag & drop image upload
- **Attribute Display**: Visual chips for detected attributes
- **Results Grid**: Product cards with verification badges
- **Filtering**: Verified/unverified product filtering

## 📁 Project Structure

```
lookmatch/
├── api/                          # Backend server
│   ├── src/
│   │   ├── server/              # Core server logic
│   │   │   ├── vision/          # Vision API processing
│   │   │   ├── describe/        # Product description generation
│   │   │   ├── search/          # Query building and search
│   │   │   ├── sources/         # Product source connectors
│   │   │   ├── urls/            # URL validation
│   │   │   ├── rank/            # Scoring and ranking
│   │   │   └── cache/           # Caching layer
│   │   ├── shared/              # Shared types and utilities
│   │   └── index.ts             # Main server entry point
│   └── package.json
├── web/                          # Frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   └── types.ts             # TypeScript types
│   └── package.json
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Cloud Vision API credentials

### Backend Setup

1. **Navigate to API directory:**
   ```bash
   cd api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   # Google Cloud Vision API
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   
   # Search APIs (optional - will run in mock mode if not provided)
   SERPAPI_KEY=your_serpapi_key_here
   EBAY_APP_ID=your_ebay_app_id_here
   
   # Server Configuration
   PORT=4000
   NODE_ENV=development
   ```

4. **Add Google Vision credentials:**
   - Place your `google-credentials.json` file in the `api/` directory
   - Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

5. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

### Frontend Setup

1. **Navigate to web directory:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## 🔑 API Keys & Services

### Required
- **Google Cloud Vision API**: For image analysis and attribute detection

### Optional (for production)
- **SerpAPI**: Google Shopping results
- **eBay Browse API**: Direct product pages
- **Bing Web Search API**: Alternative search results
- **AliExpress RapidAPI**: Additional marketplace coverage

### Mock Mode
If API keys are not provided, the system runs in mock mode with:
- Deterministic fake results for testing
- Simulated network delays
- Pre-defined product data for common searches

## 🧪 Testing

### Unit Tests
```bash
cd api
npm test
```

### Integration Tests
```bash
cd api
npm run test:integration
```

### E2E Tests (Playwright)
```bash
cd web
npm run test:e2e
```

## 📊 API Endpoints

### POST /api/analyze
Analyzes uploaded clothing images and returns normalized attributes.

**Request:**
- `multipart/form-data` with `image` field

**Response:**
```json
{
  "ok": true,
  "attributes": {
    "category": "shirt",
    "colors": ["white", "beige"],
    "material": "cotton",
    "brandHints": ["burberry"],
    "confidence": 0.85
  },
  "description": "Shirt in white and beige, cotton — inspired by Burberry. Perfect for both casual and formal occasions. Versatile styling options.",
  "query": "burberry shirt white cotton"
}
```

### GET /api/matches?query=...&limit=20
Searches for products based on the query.

**Response:**
```json
{
  "ok": true,
  "results": [
    {
      "id": "burberry-1",
      "title": "Burberry London Heritage Check Cotton Shirt",
      "url": "https://www.burberry.com/...",
      "price": { "amount": 450, "currency": "USD" },
      "merchant": "Burberry",
      "thumbnail": "https://...",
      "score": 0.95,
      "verified": true
    }
  ],
  "total": 15,
  "verifiedCount": 8
}
```

## ✅ Acceptance Criteria

### Hard Requirements

1. **Image Analysis Accuracy**
   - ✅ For images with clear brand cues (e.g., Burberry shirt), `/api/analyze` returns:
     - `category="shirt"` and includes `brandHints` containing "burberry"
     - Description reads naturally without hallucination
     - No "plaid" unless pattern was actually detected

2. **Product Search Results**
   - ✅ `/api/matches` returns ≥1 item with `verified=true` for common brands
   - ✅ Clicking verified links opens real product pages (not search pages)
   - ✅ Price information is visible on verified product pages
   - ✅ If no verified links found, returns best candidates with `verified=false`

3. **Performance Requirements**
   - ✅ p95 latency ≤ 2500ms for cached queries
   - ✅ p95 latency ≤ 4500ms for cold start with 2 sources

### Test Scenarios

#### Burberry Shirt (burberry_shirt.jpg)
- **Expected**: `category="shirt"`, `brandHints=["burberry"]`
- **Query**: "burberry shirt beige cotton"
- **Verified Results**: At least one from burberry.com, farfetch.com, matchesfashion.com
- **Reject**: Generic search pages

#### Nike Hoodie (nike_black_hoodie.jpg)
- **Expected**: `category="top"`, `brandHints=["nike"]`
- **Query**: "nike hoodie black"
- **Verified Results**: Nike.com or Foot Locker with actual product pages
- **Demote**: Amazon search pages without ASIN product pages

#### Plain Dress (plain_blue_dress.jpg)
- **Expected**: `category="dress"`, `colors=["blue"]`
- **Query**: "dress blue"
- **Verified Results**: Department store with Product schema
- **Accept**: Multi-merchant results from verified sources

## 🔍 URL Validation

The system validates URLs to ensure they point to actual product pages:

### Validation Checks
- ✅ **Schema.org**: Contains `@type":"Product"` or `og:type="product"`
- ✅ **Product Indicators**: Presence of "Add to bag/cart" buttons
- ✅ **Content Validation**: Title contains brand/category keywords
- ✅ **Domain Verification**: Final URL matches known merchant domains

### Special Cases
- **Burberry**: Must contain "burberry" in title or JSON-LD brand
- **Luxury Brands**: Enhanced validation for brand authenticity
- **Marketplaces**: Different validation rules for Amazon, eBay, etc.

## 📈 Metrics & Monitoring

### Performance Metrics
- `matches.verified_rate`: Percentage of verified results
- `matches.mean_score`: Average product match score
- `search.latency_ms`: Search response time

### Logging
- Structured logs with request IDs
- Validation failure reasons
- Source performance tracking
- Error categorization and reporting

## 🚀 Production Deployment

### Environment Variables
```bash
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
SERPAPI_KEY=your_production_key
EBAY_APP_ID=your_production_id
REDIS_URL=redis://your-redis-instance:6379
SENTRY_DSN=your_sentry_dsn
```

### Scaling Considerations
- **Concurrency**: Source searches limited to 4 concurrent requests
- **Caching**: LRU cache with 4-hour TTL, Redis for persistence
- **Rate Limiting**: Built-in timeout handling (10s per source)
- **Error Handling**: Graceful degradation when sources fail

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing issues
3. Create a new issue with detailed information

---

**LookMatch** - Making fashion discovery intelligent and reliable. 🎯✨
