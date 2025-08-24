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
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  values(): V[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  private evictOldest(): void {
    let oldestKey: K | undefined;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Clean up expired entries
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

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    missCount: number;
    hitCount: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount),
      missCount: this.missCount,
      hitCount: this.hitCount
    };
  }

  private hitCount = 0;
  private missCount = 0;

  // Override get method to track hits/misses
  getWithStats(key: K): V | undefined {
    const result = this.get(key);
    if (result !== undefined) {
      this.hitCount++;
    } else {
      this.missCount++;
    }
    return result;
  }
}

// Specialized cache for search results
export class SearchResultCache {
  private cache: LRUCache<string, any>;

  constructor(maxSize: number = 500) {
    this.cache = new LRUCache<string, any>(maxSize, 4 * 60 * 60 * 1000); // 4 hours TTL
  }

  // Generate cache key from search query and filters
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

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }

  cleanup(): number {
    return this.cache.cleanup();
  }
}

// Export singleton instance
export const searchCache = new SearchResultCache();
