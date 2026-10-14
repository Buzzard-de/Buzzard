import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isAllowedOrigin, getAllowedOrigins } = require("../lib/corsOrigins.js");

describe("corsOrigins", () => {
  it("allows documented production and local storefront origins", () => {
    const allowed = getAllowedOrigins();
    expect(allowed.has("https://buzzard24.de")).toBe(true);
    expect(allowed.has("http://localhost:3000")).toBe(true);
    expect(allowed.has("http://127.0.0.1:3040")).toBe(true);
  });

  it("allows the static-export admin test origin", () => {
    expect(isAllowedOrigin("http://127.0.0.1:3040")).toBe(true);
    expect(isAllowedOrigin("http://localhost:3040")).toBe(true);
  });

  it("allows the Playwright E2E storefront origin on 3010", () => {
    expect(isAllowedOrigin("http://localhost:3010")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3010")).toBe(true);
  });

  it("does not allow arbitrary remote origins", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("does not treat the opaque Origin null as an allowed browser origin", () => {
    expect(isAllowedOrigin("null")).toBe(false);
    expect(getAllowedOrigins().has("null")).toBe(false);
  });

  it("does not treat CORS as a wildcard allowlist", () => {
    expect(isAllowedOrigin("*")).toBe(false);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });
});
