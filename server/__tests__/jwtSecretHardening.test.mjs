import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshServerLib, tempDataDir } from "./support/freshServerLib.mjs";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");

const FORMER_BUILT_IN_SECRET = "DEV_ONLY_CHANGE_ME";
const adminClaims = { sub: 1, email: "forged@unit.buzzard.test", role: "admin" };

let lib;

afterEach(() => {
  lib?.restore();
  lib = null;
  vi.restoreAllMocks();
});

describe("JWT signing key", () => {
  it("rejects an admin token signed with the former built-in secret when no secret is configured", () => {
    lib = freshServerLib({ JWT_SECRET: undefined, AUTH_SECRET: undefined, BUZZARD_DATA_DIR: tempDataDir("jwt") });
    const dbAuth = lib.load("dbAuth.js");
    const forged = jwt.sign(adminClaims, FORMER_BUILT_IN_SECRET, { expiresIn: "1h" });
    expect(() => dbAuth.verifyToken(forged)).toThrow();
    expect(dbAuth.isDefaultJwtSecret()).toBe(true);
    expect(dbAuth.getJwtSecret()).not.toBe(FORMER_BUILT_IN_SECRET);
    expect(dbAuth.getJwtSecret().length).toBeGreaterThanOrEqual(64);

    const auth = lib.load("auth.js");
    const res = { statusCode: null, status(code) { this.statusCode = code; return this; }, json() { return this; } };
    vi.spyOn(console, "log").mockImplementation(() => {});
    const identity = auth.requireAuth(
      { headers: { authorization: `Bearer ${forged}` }, socket: { remoteAddress: "198.51.100.5" }, url: "/api/admin/me" },
      res
    );
    expect(identity).toBeFalsy();
    expect(res.statusCode).toBe(401);
  });

  it("uses a different key in every process that has no secret configured", () => {
    lib = freshServerLib({ JWT_SECRET: undefined, AUTH_SECRET: undefined });
    const first = lib.load("jwtSecret.js").secret;
    lib.restore();
    lib = freshServerLib({ JWT_SECRET: undefined, AUTH_SECRET: undefined });
    expect(lib.load("jwtSecret.js").secret).not.toBe(first);
  });

  it("verifies its own tokens with the configured secret and rejects other keys", () => {
    const secret = "unit-test-secret-0123456789abcdef0123456789abcdef";
    lib = freshServerLib({ JWT_SECRET: secret, AUTH_SECRET: undefined });
    const dbAuth = lib.load("dbAuth.js");
    expect(dbAuth.isDefaultJwtSecret()).toBe(false);
    const own = dbAuth.signUser({ id: 7, email: "customer@unit.buzzard.test", role: "customer", name: "Synthetic" });
    expect(dbAuth.verifyToken(own).email).toBe("customer@unit.buzzard.test");
    expect(() => dbAuth.verifyToken(jwt.sign(adminClaims, `${secret}x`))).toThrow();
    expect(() => dbAuth.verifyToken(jwt.sign(adminClaims, FORMER_BUILT_IN_SECRET))).toThrow();
  });

  it("honours AUTH_SECRET when JWT_SECRET is absent", () => {
    lib = freshServerLib({ JWT_SECRET: undefined, AUTH_SECRET: "unit-auth-secret-0123456789abcdef0123456789abcdef" });
    expect(lib.load("dbAuth.js").isDefaultJwtSecret()).toBe(false);
  });
});

describe("production environment validation", () => {
  const strong = "unit-test-secret-0123456789abcdef0123456789abcdef";

  function validate(env) {
    lib = freshServerLib({
      NODE_ENV: "production",
      BUZZARD_DATA_DIR: tempDataDir("env"),
      BUZZARD_TEST_MODE: undefined,
      BUZZARD_RATE_LIMIT_DISABLED: undefined,
      ADMIN_EMAIL: undefined,
      ADMIN_PASSWORD: undefined,
      AUTH_SECRET: undefined,
      RENDER: undefined,
      BUZZARD_ENV: undefined,
      ...env,
    });
    return lib.load("environmentValidation.js").validateEnvironment();
  }

  it("fails without a JWT secret", () => {
    const result = validate({ JWT_SECRET: undefined });
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("jwt_secret_missing");
  });

  it.each([FORMER_BUILT_IN_SECRET, "dev-secret-change-me", "short-secret"])("fails with the weak secret %s", (secret) => {
    const result = validate({ JWT_SECRET: secret });
    expect(result.errors.map((error) => error.code)).toContain("jwt_secret_weak");
  });

  it("passes with a strong secret and a usable first administrator", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const result = validate({ JWT_SECRET: strong, ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: "Unit-Bootstrap-Value-4711" });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("fails with a strong secret but nothing to create the first administrator from", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = validate({ JWT_SECRET: strong });
    expect(result.errors.map((error) => error.code)).toEqual(["admin_bootstrap_missing"]);
  });

  it.each([
    ["Short-1x", "admin_password_weak"],
    ["Unit-Bootstrap-Value-4711", "admin_email_invalid", "not-an-address"],
  ])("fails with an unusable first administrator (%s → %s)", (password, code, email = "owner@unit.buzzard.test") => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = validate({ JWT_SECRET: strong, ADMIN_EMAIL: email, ADMIN_PASSWORD: password });
    expect(result.errors.map((error) => error.code)).toEqual([code]);
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it.each([
    "a".repeat(40),
    "abcabcabcabcabcabcabcabcabcabcabcabc",
    "please-change-me-please-change-me-0123",
    "your-secret-your-secret-your-secret-01",
    "example-example-example-example-0123456",
  ])("fails with the placeholder or low-entropy secret %s", (secret) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = validate({ JWT_SECRET: secret, ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: "Unit-Bootstrap-Value-4711" });
    expect(result.errors.map((error) => error.code)).toEqual(["jwt_secret_weak"]);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("applies the production rules on a hosted runtime without NODE_ENV=production", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = validate({ NODE_ENV: "development", RENDER: "true", JWT_SECRET: undefined });
    expect(result.environment).toBe("production");
    expect(result.errors.map((error) => error.code)).toContain("jwt_secret_missing");
    expect(result.warnings.map((warning) => warning.code)).toContain("node_env_not_production");
  });

  it("warns when the number of trusted proxies is not configured", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const env = { JWT_SECRET: strong, ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: "Unit-Bootstrap-Value-4711" };
    expect(validate({ ...env, BUZZARD_TRUSTED_PROXY_HOPS: undefined }).warnings.map((w) => w.code)).toContain("trusted_proxy_hops_unset");
    lib.restore();
    expect(validate({ ...env, BUZZARD_TRUSTED_PROXY_HOPS: "1" }).warnings.map((w) => w.code)).not.toContain("trusted_proxy_hops_unset");
  });

  it("fails when stored admin accounts still use seed passwords", () => {
    const dataDir = tempDataDir("env");
    lib = freshServerLib({ NODE_ENV: "test", BUZZARD_DATA_DIR: dataDir });
    lib.load("auth.js").login("nobody@unit.buzzard.test", "x", { headers: {}, socket: { remoteAddress: "198.51.100.6" } });
    lib.restore();

    const result = validate({ JWT_SECRET: strong, BUZZARD_DATA_DIR: dataDir });
    expect(result.errors.map((error) => error.code)).toEqual(["default_admin_credentials"]);
    expect(JSON.stringify(result)).not.toMatch(/scrypt:|password_hash/);
  });

  it("refuses to start in production when validation fails", () => {
    lib = freshServerLib({ NODE_ENV: "production", JWT_SECRET: undefined, AUTH_SECRET: undefined, BUZZARD_DATA_DIR: tempDataDir("env") });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => lib.load("environmentValidation.js").assertProductionSafeStartup()).toThrow(/JWT_SECRET/);
  });

  it("does not block development without a secret", () => {
    lib = freshServerLib({ NODE_ENV: "development", JWT_SECRET: undefined, AUTH_SECRET: undefined, BUZZARD_DATA_DIR: tempDataDir("env") });
    expect(lib.load("environmentValidation.js").validateEnvironment().ok).toBe(true);
  });
});
