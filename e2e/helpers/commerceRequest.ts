import type { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * Cart mutations share an IP-scoped limiter (commerce-cart, 120 / 60s).
 * E2E against a production-like API must retry 429 instead of disabling the limiter.
 */
export async function postCommerce(
  request: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  retries = 8,
): Promise<APIResponse> {
  let last: APIResponse | undefined;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    last = await request.post(url, { data });
    if (last.status() !== 429) return last;
    const retryAfter = Number(last.headers()["retry-after"]);
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5_000) : 400 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return last as APIResponse;
}
