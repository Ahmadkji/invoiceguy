type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, Bucket>;
type RpcRateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => unknown;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

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

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

function toRateLimitResult(raw: unknown): RateLimitResult | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Partial<RpcRateLimitRow>;
  if (typeof record.allowed !== "boolean") {
    return null;
  }

  const remaining = Number(record.remaining ?? 0);
  const retryAfterSeconds = Number(record.retry_after_seconds ?? 0);

  return {
    allowed: record.allowed,
    remaining: Number.isFinite(remaining) ? Math.max(0, Math.trunc(remaining)) : 0,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds)
      ? Math.max(0, Math.trunc(retryAfterSeconds))
      : 0,
  };
}

async function checkRateLimitSupabase(
  supabase: SupabaseRpcClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const rpcResult = supabase.rpc("consume_rate_limit", {
    p_scope_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
    p_now: new Date().toISOString(),
  }) as Promise<{ data: unknown; error: { message?: string | null } | null }>;
  const { data, error } = await rpcResult;

  if (error) {
    throw new Error(error.message ?? "Unknown Supabase RPC error.");
  }

  const parsed = toRateLimitResult(data);
  if (!parsed) {
    throw new Error("Unexpected consume_rate_limit response.");
  }

  return parsed;
}

export async function checkRateLimitWithProvider(
  key: string,
  limit: number,
  windowMs: number,
  options?: { supabase?: SupabaseRpcClient }
): Promise<RateLimitResult> {
  const provider = (process.env.RATE_LIMIT_PROVIDER ?? "memory").toLowerCase();

  if (provider === "supabase" && options?.supabase) {
    try {
      return await checkRateLimitSupabase(options.supabase, key, limit, windowMs);
    } catch (error) {
      // Fall back to in-memory limiter to avoid breaking auth/mutation flows.
      console.error("[rate-limit] Supabase provider failed, falling back to memory.", {
        provider,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return checkRateLimit(key, limit, windowMs);
}
