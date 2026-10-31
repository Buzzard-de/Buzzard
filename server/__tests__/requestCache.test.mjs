import { describe, it, expect } from "vitest";
import { createTtlCache, cacheKey } from "../lib/requestCache.js";

describe("requestCache", () => {
  it("returns stored values until expiry", () => {
    const cache = createTtlCache({ ttlMs: 10_000, maxEntries: 8 });
    cache.set("a", { ok: true });
    expect(cache.get("a")).toEqual({ ok: true });
    expect(cache.size()).toBe(1);
  });

  it("evicts the oldest entry when full", () => {
    const cache = createTtlCache({ ttlMs: 10_000, maxEntries: 2 });
    cache.set("one", 1);
    cache.set("two", 2);
    cache.set("three", 3);
    expect(cache.get("one")).toBeUndefined();
    expect(cache.get("three")).toBe(3);
  });

  it("normalizes search cache keys", () => {
    expect(cacheKey(["VW", " Golf ", null])).toBe("vw|golf|");
  });
});
