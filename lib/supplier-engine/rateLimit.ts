const buckets = new Map<string, { tokens: number; lastRefill: number }>();

export interface RateLimitConfig {
  requestsPerMinute: number;
}

export function checkRateLimit(
  supplierId: string,
  config: RateLimitConfig = { requestsPerMinute: 60 }
): { allowed: boolean; retryAfterMs?: number } {
  const key = supplierId;
  const now = Date.now();
  const rpm = Math.max(1, config.requestsPerMinute);
  const refillRate = rpm / 60000; // tokens per ms

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: rpm, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(rpm, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate);
    return { allowed: false, retryAfterMs };
  }

  bucket.tokens -= 1;
  return { allowed: true };
}

export function handleRateLimitResponse(retryAfterHeader?: string): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return 60000;
}

export function resetRateLimit(supplierId?: string): void {
  if (supplierId) buckets.delete(supplierId);
  else buckets.clear();
}
