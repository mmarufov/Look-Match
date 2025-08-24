# LookMatch API

Production-ready image analyze + product matching service.

## Quick start

1) Set env vars (see ENV.md). Minimum for mock mode:

```
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

2) Build and run:

```
npm run build
npm start
```

- Server: http://localhost:4000
- Health: GET /health
- Analyze (URL): POST /api/analyze { imageUrl }
- Analyze (upload): POST /api/analyze-upload (multipart image)
- Matches: GET /api/matches?query=white%20t-shirt&limit=10

## Features

- Google Vision label + web detection
- Attribute normalize → deterministic description
- Multi-source search (mock, SerpAPI, eBay, Bing, AliExpress)
- URL validation, ranking & metrics
- LRU cache with optional Redis adapter (REDIS_URL)
- Zod request validation
- Sentry placeholders (SENTRY_DSN)

## Caching

- Default: in-memory LRU
- Optional: Redis via REDIS_URL

## Telemetry

- Set SENTRY_DSN and install @sentry/node to enable captures.

## Development tips

- Use /health to verify sources, cache stats, metrics
- Run only API during dev to avoid Next.js port clashes
