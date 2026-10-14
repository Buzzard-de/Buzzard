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
});
