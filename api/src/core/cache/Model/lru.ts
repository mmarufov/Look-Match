interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 4 * 60 * 60 * 1000) { // 4 hours default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl?: number): void {
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    // Remove old entry if it exists
    this.cache.delete(key);

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean { return this.cache.delete(key); }
  clear(): void { this.cache.clear(); }
  size(): number { return this.cache.size; }

  private evictOldest(): void {
    let oldestKey: K | undefined;
    let oldestTimestamp = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  cleanup(): number {
    const beforeSize = this.cache.size;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    return beforeSize - this.cache.size;
  }
}

export class SearchResultCache {
  private cache: LRUCache<string, any>;
  constructor(maxSize: number = 500) {
    this.cache = new LRUCache<string, any>(maxSize, 4 * 60 * 60 * 1000);
  }
  generateKey(query: string, filters: Record<string, any> = {}): string {
    const filterString = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${Array.isArray(value) ? value.sort().join(',') : value}`)
      .join('|');
    return `${query}|${filterString}`;
  }
  set(query: string, filters: Record<string, any>, results: any): void {
    const key = this.generateKey(query, filters);
    this.cache.set(key, results);
  }
  get(query: string, filters: Record<string, any> = {}): any | undefined {
    const key = this.generateKey(query, filters);
    return this.cache.get(key);
  }
  has(query: string, filters: Record<string, any> = {}): boolean {
    const key = this.generateKey(query, filters);
    return this.cache.has(key);
  }
  delete(query: string, filters: Record<string, any> = {}): boolean {
    const key = this.generateKey(query, filters);
    return this.cache.delete(key);
  }
  clear(): void { this.cache.clear(); }
  getStats() { return { size: this.cache.size() }; }
  cleanup(): number { return this.cache.cleanup(); }
}

export const searchCache = new SearchResultCache();


