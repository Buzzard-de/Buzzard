import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { resolveInitialCountryCode } from "./resolveInitialCountry";

describe("resolveInitialCountryCode", () => {
  it("prefers manual persisted country over detection", () => {
    expect(
      resolveInitialCountryCode({ stored: "DE", manual: true, detected: "IE", defaultCode: "DE" })
    ).toBe("DE");
  });

  it("prefers any stored country over detection", () => {
    expect(
      resolveInitialCountryCode({ stored: "IT", manual: false, detected: "IE", defaultCode: "DE" })
    ).toBe("IT");
  });

  it("uses detection when nothing is stored", () => {
    expect(
      resolveInitialCountryCode({ stored: null, manual: false, detected: "FR", defaultCode: "DE" })
    ).toBe("FR");
  });

  it("does not consult language", () => {
    const source = readFileSync(resolve("lib/market/resolveInitialCountry.ts"), "utf8");
    expect(source).not.toContain("locale");
    expect(source).not.toContain("setLocale");
  });
});
