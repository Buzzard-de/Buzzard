import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { coverage, listCelebrations, matchToday } = require("../lib/storefront/holidayProgram.js");
const { AB27 } = require("../lib/commerce/ab27Tax.js");

describe("EU27 and extended celebration data", () => {
  it("covers every AB27 country with national and cultural rows", () => {
    const cov = coverage();
    expect(cov.sourcedCountries).toBe(AB27.length);
    expect(cov.culturalCountries).toBe(AB27.length);
    expect(cov.missingCountries).toEqual([]);
    expect(cov.missingCultural).toEqual([]);
    expect(cov.softwareCoverageReady).toBe(true);
    expect(cov.completeClaim).toBe(false);
    expect(cov.liveVerified).toBe(false);
  });

  it("lists TR and GCC extended market celebrations", () => {
    const tr = listCelebrations("TR");
    expect(tr.extended.length).toBeGreaterThan(0);
    const de = matchToday({ country: "DE", today: "2026-10-03" });
    expect(de.hitNational).toBeTruthy();
    expect(de.anyHit).toBe(true);
    expect(de.published).toBe(false);
  });
});