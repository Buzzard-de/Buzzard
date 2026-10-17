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

  it("health limiter is a separate bucket from the general API limiter", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter } = require("../lib/rateLimitStore");
    const api = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: "api:" });
    const health = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: "api-health:" });
    const req = { headers: { "x-forwarded-for": "10.0.0.8" }, socket: { remoteAddress: "10.0.0.8" } };
    expect(api(req)).toBe(false);
    expect(api(req)).toBe(false);
    expect(api(req)).toBe(true);
    expect(health(req)).toBe(false);
    expect(health(req)).toBe(false);
    expect(health(req)).toBe(true);
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

  it("treats /api/health paths as independent of /api commerce routes", () => {
    const { isHealthPath } = require("../lib/healthPaths");
    expect(isHealthPath("/api/health")).toBe(true);
    expect(isHealthPath("/api/health/live")).toBe(true);
    expect(isHealthPath("/api/cart")).toBe(false);
    expect(isHealthPath("/api/admin/login")).toBe(false);
    expect(isHealthPath("/health")).toBe(false);
  });

  it("resolveBackend respects env", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "file";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { getStoreInfo } = require("../lib/rateLimitStore");
    expect(getStoreInfo().configured).toBe("file");
  });

  it("serial burst of 40 against max 10 blocks the overflow (load-safe, not production)", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter } = require("../lib/rateLimitStore");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: "burst:" });
    const req = { headers: { "x-forwarded-for": "203.0.113.40" }, socket: { remoteAddress: "203.0.113.40" } };
    let blocked = 0;
    for (let i = 0; i < 40; i += 1) {
      if (limiter(req)) blocked += 1;
    }
    expect(blocked).toBe(30);
  });

  it("same-tick concurrent burst still serializes and does not admit over max", () => {
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_RATE_LIMIT_STORE = "memory";
    delete require.cache[require.resolve("../lib/rateLimitStore")];
    const { createRateLimiter } = require("../lib/rateLimitStore");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 8, keyPrefix: "conc:" });
    const req = { headers: { "x-forwarded-for": "198.51.100.8" }, socket: { remoteAddress: "198.51.100.8" } };
    const results = Array.from({ length: 24 }, () => limiter(req));
    const admitted = results.filter((limited) => limited === false).length;
    const blocked = results.filter((limited) => limited === true).length;
    expect(admitted).toBe(8);
    expect(blocked).toBe(16);
  });
});
