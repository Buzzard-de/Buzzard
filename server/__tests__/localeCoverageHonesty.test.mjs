import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("product i18n coverage honesty (item 70 established scope)", () => {
  it("does not invent translations and keeps language independent of market", () => {
    const software = require("../lib/software");
    const locales = software.localeCoverage.measure();
    expect(locales.inventedTranslations).toBe(false);
    expect(locales.autoInventTranslations).toBe(false);
    expect(locales.languageIndependentFromMarket).toBe(true);
    expect(locales.fallback).toBe("de");
    expect(Array.isArray(locales.missingLocales)).toBe(true);
  });

  it("fill-product-i18n-gaps stays dry-run capable and does not enable sales", () => {
    const script = fs.readFileSync(path.join(root, "scripts/fill-product-i18n-gaps.mjs"), "utf8");
    expect(script).toContain("--dry-run");
    expect(script).toContain("Does not modify images or enable sales");
    expect(script).not.toMatch(/BUZZARD_SALES_ENABLED\s*=\s*["']?1/);
  });
});
