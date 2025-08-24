# Environment variables

Backend

- GOOGLE_APPLICATION_CREDENTIALS: Path to Google key JSON (optional if using ADC)
- SERPAPI_KEY: Google Shopping via SerpAPI
- EBAY_APP_ID: eBay Browse API key
- BING_API_KEY or BING_SUBSCRIPTION_KEY: Bing Web Search key
- ALIEXPRESS_RAPIDAPI_KEY: RapidAPI key for AliExpress
- ALIEXPRESS_RAPIDAPI_HOST: RapidAPI host for AliExpress
- REDIS_URL: redis://host:port (optional; enables Redis cache)
- SENTRY_DSN: Enable Sentry error telemetry (requires @sentry/node)

Frontend

- NEXT_PUBLIC_API_URL: API base URL (default http://localhost:4000)
