import "server-only";
import Redis from "ioredis";

/**
 * A small JSON cache: Redis when REDIS_URL is set, otherwise memory in this process (dev, tests). Losing an entry
 * only costs a fresh lookup, so errors talking to Redis are swallowed and the caller just fetches again.
 */
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

class MemoryCache implements Cache {
  private m = new Map<string, { v: string; until: number }>();
  async get<T>(key: string) {
    const e = this.m.get(key);
    if (!e) return undefined;
    if (e.until < Date.now()) {
      this.m.delete(key);
      return undefined;
    }
    return JSON.parse(e.v) as T;
  }
  async set(key: string, value: unknown, ttl: number) {
    if (this.m.size > 5000) this.m.delete(this.m.keys().next().value!);
    this.m.set(key, { v: JSON.stringify(value), until: Date.now() + ttl * 1000 });
  }
}

class RedisCache implements Cache {
  constructor(private r: Redis) {}
  async get<T>(key: string) {
    try {
      const v = await this.r.get(key);
      return v == null ? undefined : (JSON.parse(v) as T);
    } catch {
      return undefined;
    }
  }
  async set(key: string, value: unknown, ttl: number) {
    try {
      await this.r.set(key, JSON.stringify(value), "EX", Math.max(1, Math.round(ttl)));
    } catch {
      // A cache that can't write is just a miss next time.
    }
  }
}

let cache: Cache | undefined;

export function getCache(): Cache {
  if (cache) return cache;
  const url = process.env.REDIS_URL;
  cache = url
    ? new RedisCache(new Redis(url, { keyPrefix: "tuma:", maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false }))
    : new MemoryCache();
  return cache;
}

/** For tests: start from an empty memory cache. */
export function resetCacheForTests() {
  cache = new MemoryCache();
}

/** The cached value for `key`, or what `load` returns (then cached for `ttl` seconds). Null answers aren't cached. */
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const c = getCache();
  const hit = await c.get<T>(key);
  if (hit !== undefined) return { value: hit, hit: true };
  const value = await load();
  if (value != null) await c.set(key, value, ttl);
  return { value, hit: false };
}
