import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("rateLimitStore", () => {
  const prevStore = process.env.BUZZARD_RATE_LIMIT_STORE;
  const prevTestMode = process.env.BUZZARD_TEST_MODE;

  afterEach(() => {
    process.env.BUZZARD_RATE_LIMIT_STORE = prevStore;
    if (prevTestMode === undefined) delete process.env.BUZZARD_TEST_MODE;
    else process.env.BUZZARD_TEST_MODE = prevTestMode;
    delete require.cache[require.resolve("../lib/rateLimitStore")];
  });

  it("memory backend rate limits after max requests", () => {
    delete process.env.BUZZARD_TEST_MODE;
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

  it("commerce-cart limiter is IP-scoped so a second client is not blocked", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter } = require("../lib/rateLimitStore");
    const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: "commerce-cart:" });
    const ipA = { headers: { "x-forwarded-for": "10.0.0.1" }, socket: { remoteAddress: "10.0.0.1" } };
    const ipB = { headers: { "x-forwarded-for": "10.0.0.2" }, socket: { remoteAddress: "10.0.0.2" } };
    expect(limiter(ipA)).toBe(false);
    expect(limiter(ipA)).toBe(false);
    expect(limiter(ipA)).toBe(true);
    expect(limiter(ipB)).toBe(false);
  });

  it("BUZZARD_TEST_MODE disables the limiter (E2E isolation only)", () => {
    process.env.BUZZARD_TEST_MODE = "1";
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter, isRateLimitDisabled } = require("../lib/rateLimitStore");
    expect(isRateLimitDisabled()).toBe(true);
    const limiter = createRateLimiter({ windowMs: 60000, max: 1, keyPrefix: "commerce-cart:" });
    const req = { headers: { "x-forwarded-for": "10.0.0.9" }, socket: { remoteAddress: "10.0.0.9" } };
    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(false);
  });

  it("resolveBackend respects env", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "file";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { getStoreInfo } = require("../lib/rateLimitStore");
    expect(getStoreInfo().configured).toBe("file");
  });
});
