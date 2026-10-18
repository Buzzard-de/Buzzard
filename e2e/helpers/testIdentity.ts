/**
 * Isolate E2E callers under production-like rate limits.
 * Uses TEST-NET addresses (RFC 5737). Does not disable the limiter.
 */

let sequence = 0;

export function uniqueTestIp(_label = "e2e"): string {
  sequence += 1;
  const host = (sequence % 250) + 1;
  const net = Math.floor(sequence / 250) % 200;
  return `203.0.${net}.${host}`;
}

export function identityHeaders(label?: string): Record<string, string> {
  return { "x-forwarded-for": uniqueTestIp(label) };
}
