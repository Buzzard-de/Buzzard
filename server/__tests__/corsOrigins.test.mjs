import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { originAllowed } = require("../lib/corsOrigins");

describe("CORS origins", () => {
  const env = { BUZZARD_CORS_ORIGINS: "" };

  it("rejects an unlisted origin and the null origin unless it is listed", () => {
    expect(originAllowed("https://evil.example", env)).toBe(false);
    expect(originAllowed("null", env)).toBe(false);
    expect(originAllowed("null", { BUZZARD_CORS_ORIGINS: "null" })).toBe(true);
    expect(originAllowed("https://buzzard24.de", env)).toBe(true);
    expect(originAllowed("http://localhost:3000", env)).toBe(true);
    expect(originAllowed(undefined, env)).toBe(false);
  });
});
