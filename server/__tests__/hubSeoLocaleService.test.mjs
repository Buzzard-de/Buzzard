import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  validateHubSeoCoverage,
  validateExtendedLocaleFallback,
  buildHubSeoMeta,
} = require("../lib/storefront/hubSeoLocaleService.js");

describe("hub SEO and locale coverage", () => {
  it("covers 50 active hubs across de/en/tr/ar", () => {
    const report = validateHubSeoCoverage();
    expect(report.activeHubs).toBe(50);
    expect(report.missingPrimary).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("resolves 30-locale fallback labels without gaps", () => {
    const ext = validateExtendedLocaleFallback();
    expect(ext.ok).toBe(true);
    expect(ext.locales).toBeGreaterThanOrEqual(30);
  });

  it("builds non-invented SEO meta for a hub", () => {
    const meta = buildHubSeoMeta("cat-05", "de");
    expect(meta.ok).toBe(true);
    expect(meta.livePublish).toBe(false);
    expect(meta.title).toContain("Buzzard");
  });
});