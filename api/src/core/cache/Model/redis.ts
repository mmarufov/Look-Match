// Redis cache adapter (optional - falls back to LRU if not configured)
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export function createCacheAdapter() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('Redis not configured, using LRU cache');
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisClient.connect().catch(console.error);
  }

  return {
    async get(key: string) {
      try {
        if (!redisClient) return null;
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        return null;
      }
    },
    
    async set(key: string, value: any, ttlMs: number) {
      try {
        if (!redisClient) return;
        const ttlSeconds = Math.floor(ttlMs / 1000);
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  };
}





