import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveJwtSecret, isUnsafeJwtSecret } = require("../lib/jwtSecret.js");
const { validateEnvironment } = require("../lib/environmentValidation.js");

describe("production JWT fail-closed", () => {
  it("treats empty and documented defaults as unsafe", () => {
    expect(isUnsafeJwtSecret("")).toBe(true);
    expect(isUnsafeJwtSecret("DEV_ONLY_CHANGE_ME")).toBe(true);
    expect(isUnsafeJwtSecret("dev-secret-change-me")).toBe(true);
    expect(isUnsafeJwtSecret("unique-operator-secret")).toBe(false);
  });

  it("throws in production when the secret is missing or default", () => {
    expect(() => resolveJwtSecret({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
    expect(() =>
      resolveJwtSecret({ NODE_ENV: "production", JWT_SECRET: "DEV_ONLY_CHANGE_ME" })
    ).toThrow(/JWT_SECRET/);
  });

  it("allows the development fallback outside production", () => {
    expect(resolveJwtSecret({ NODE_ENV: "test" })).toBe("DEV_ONLY_CHANGE_ME");
  });

  it("fails environment validation in production for default JWT secrets", () => {
    const prevNode = process.env.NODE_ENV;
    const prevJwt = process.env.JWT_SECRET;
    const prevAuth = process.env.AUTH_SECRET;
    const prevTest = process.env.BUZZARD_TEST_MODE;
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.BUZZARD_TEST_MODE;
    const result = validateEnvironment();
    process.env.NODE_ENV = prevNode;
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
    if (prevAuth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevAuth;
    if (prevTest === undefined) delete process.env.BUZZARD_TEST_MODE;
    else process.env.BUZZARD_TEST_MODE = prevTest;
    expect(result.ok).toBe(false);
    expect(result.errors.some((row) => row.code === "default_jwt_secret")).toBe(true);
  });

  it("fails production validation when live payments are armed without sales", () => {
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      AUTH_SECRET: process.env.AUTH_SECRET,
      TEST: process.env.BUZZARD_TEST_MODE,
      SALES: process.env.BUZZARD_SALES_ENABLED,
      LIVE: process.env.BUZZARD_LIVE_PAYMENTS,
    };
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "unique-operator-secret-for-validation";
    delete process.env.AUTH_SECRET;
    delete process.env.BUZZARD_TEST_MODE;
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_LIVE_PAYMENTS = "1";
    const result = require("../lib/environmentValidation.js").validateEnvironment();
    process.env.NODE_ENV = prev.NODE_ENV;
    if (prev.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prev.JWT_SECRET;
    if (prev.AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev.AUTH_SECRET;
    if (prev.TEST === undefined) delete process.env.BUZZARD_TEST_MODE;
    else process.env.BUZZARD_TEST_MODE = prev.TEST;
    if (prev.SALES === undefined) delete process.env.BUZZARD_SALES_ENABLED;
    else process.env.BUZZARD_SALES_ENABLED = prev.SALES;
    if (prev.LIVE === undefined) delete process.env.BUZZARD_LIVE_PAYMENTS;
    else process.env.BUZZARD_LIVE_PAYMENTS = prev.LIVE;
    expect(result.ok).toBe(false);
    expect(result.errors.some((row) => row.code === "live_payments_without_sales")).toBe(true);
  });
});
