import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("rateLimitStore", () => {
  const prevStore = process.env.BUZZARD_RATE_LIMIT_STORE;

  afterEach(() => {
    process.env.BUZZARD_RATE_LIMIT_STORE = prevStore;
    delete require.cache[require.resolve("../lib/rateLimitStore")];
  });

  it("memory backend rate limits after max requests", () => {
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter, getStoreInfo } = require("../lib/rateLimitStore");

    expect(getStoreInfo().backend).toBe("memory");
    const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: "test:" });
    const req = { headers: { "x-forwarded-for": "1.2.3.4" }, socket: { remoteAddress: "1.2.3.4" } };

    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(true);
  });

  it("resolveBackend respects env", () => {
    process.env.BUZZARD_RATE_LIMIT_STORE = "file";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { getStoreInfo } = require("../lib/rateLimitStore");
    expect(getStoreInfo().configured).toBe("file");
  });
});
