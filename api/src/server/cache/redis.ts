import { SearchResultCache } from './lru';

// Optional Redis-backed cache with LRU fallback. If REDIS_URL is not set or
// redis client is unavailable, fallback to in-memory LRU.

export interface CacheAdapter<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
}

class LRUAdapter<T> implements CacheAdapter<T> {
  private lru = new SearchResultCache(500);
  async get(key: string) {
    return this.lru.get(key);
  }
  async set(key: string, value: T, _ttlMs?: number) {
    // TTL handled by LRU default
    this.lru.set(key, {}, value);
  }
}

class RedisAdapter<T> implements CacheAdapter<T> {
  private client: any;
  constructor(client: any) { this.client = client; }
  async get(key: string) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) as T : undefined;
  }
  async set(key: string, value: T, ttlMs: number = 4 * 60 * 60 * 1000) {
    await this.client.set(key, JSON.stringify(value), { PX: ttlMs });
  }
}

export async function createCacheAdapter<T>(): Promise<CacheAdapter<T>> {
  const url = process.env.REDIS_URL;
  if (!url) return new LRUAdapter<T>();

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('redis');
    const tlsEnabled = url.startsWith('rediss://');
    const client = createClient({ url, socket: tlsEnabled ? { tls: true } : undefined });
    client.on('error', (err: any) => console.error('Redis error', err?.message || err));
    await client.connect();
    // eslint-disable-next-line no-console
    console.log('Redis cache connected');
    return new RedisAdapter<T>(client);
  } catch (err) {
    console.warn('Redis not available, falling back to LRU:', (err as any)?.message || err);
    return new LRUAdapter<T>();
  }
}


