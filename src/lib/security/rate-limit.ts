type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, Bucket>;

declare global {
  var __invoiceguyRateLimitStore__: RateLimitStore | undefined;
}

const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes
const MAX_STORE_SIZE = 10_000;

function getStore(): RateLimitStore {
  if (!globalThis.__invoiceguyRateLimitStore__) {
    globalThis.__invoiceguyRateLimitStore__ = new Map<string, Bucket>();
    const timer = setInterval(() => {
      const store = globalThis.__invoiceguyRateLimitStore__;
      if (!store) return;
      const now = Date.now();
      for (const [key, bucket] of store.entries()) {
        if (now >= bucket.resetAt) store.delete(key);
      }
    }, CLEANUP_INTERVAL_MS);
    if (timer.unref) timer.unref();
  }
  return globalThis.__invoiceguyRateLimitStore__;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const store = getStore();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // Evict expired entries proactively when store grows large
    if (store.size > MAX_STORE_SIZE) {
      for (const [k, v] of store.entries()) {
        if (now >= v.resetAt) store.delete(k);
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: 0,
  };
}
