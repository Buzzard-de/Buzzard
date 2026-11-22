import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildHubSeoMeta,
  buildL2SeoMeta,
  auditL2ReviewedCopy,
  reviewedLabel,
} = require("../lib/storefront/hubSeoLocaleService.js");
const { listActiveL2 } = require("../lib/pim/subcategoryCatalogProfile.js");
const { buildCategorySeo } = require("../lib/storefront/storefrontSeoService.js");
const { evaluatePhase2CategoryInfrastructure } = require("../lib/platform/phase2CategoryInfrastructure.js");

describe("phase 2 L2 and hub copy", () => {
  it("marks a hub locale reviewed only when that locale has its own string", () => {
    const german = buildHubSeoMeta("cat-01", "de");
    const french = buildHubSeoMeta("cat-01", "fr");
    expect(german.reviewed).toBe(true);
    expect(german.fallbackFrom).toBeNull();
    expect(german.title.startsWith("Textil")).toBe(true);
    expect(french.reviewed).toBe(true);
    expect(french.fallbackFrom).toBeNull();
    expect(french.title.startsWith(reviewedLabel("cat-01", "fr").label)).toBe(true);
    expect(french.title.startsWith("Textil —")).toBe(false);
  });

  it("does not present an untranslated L2 name as reviewed French copy", () => {
    const uncovered = listActiveL2().find((row) => !reviewedLabel(row.id, "fr").reviewed);
    expect(uncovered).toBeTruthy();
    const page = buildL2SeoMeta(uncovered.id, "fr");
    const seo = buildCategorySeo(uncovered.id, "fr");
    expect(page.reviewed).toBe(false);
    expect(page.fallbackFrom).toBe("source");
    expect(page.professionalCopy).toBe(false);
    expect(seo.reviewed).toBe(false);
    expect(seo.fallbackFrom).toBe("source");
    expect(seo.title).toBe(page.label);
  });

  it("uses the reviewed French label for a textile leaf", () => {
    const page = buildL2SeoMeta("cat-01-01-01", "fr");
    expect(page.reviewed).toBe(true);
    expect(page.fallbackFrom).toBeNull();
    expect(page.label).toBe("Robe");
    expect(page.professionalCopy).toBe(false);
  });

  it("keeps phase 2 partial while L2 locales are still missing reviewed copy", () => {
    const audit = auditL2ReviewedCopy();
    const phase = evaluatePhase2CategoryInfrastructure();
    expect(audit.l2Count).toBe(330);
    expect(audit.missingReviewedLocales).toBeGreaterThan(0);
    expect(audit.reviewedAllLocales).toBeLessThan(330);
    expect(audit.completeClaim).toBe(false);
    expect(phase.completeClaim).toBe(false);
    expect(phase.percentComplete).toBe(100);
  });
});
