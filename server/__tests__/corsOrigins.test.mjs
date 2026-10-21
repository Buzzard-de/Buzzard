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

  it("does not allow arbitrary remote origins", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });
});
