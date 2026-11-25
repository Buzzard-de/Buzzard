import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildLinks, planListing, resolveTarget, routesFor } = require("../lib/marketplace/europe/categoryInventory");

describe("europe category inventory", () => {
  it("resolves every inventory name to one canonical platform", () => {
    const built = buildLinks();
    expect(built.missing).toEqual([]);
    expect(resolveTarget("Amazon").platform.id).toBe("amazon");
    expect(resolveTarget("Amazon Automotive").platform.id).toBe("amazon");
    expect(resolveTarget("Amazon Automotive").facet.buzzardCategory).toBe("bz.01");
    expect(resolveTarget("eMAG").platform.id).toBe(resolveTarget("eMAG.hu").platform.id);
    expect(resolveTarget("OTTO Fashion").platform.id).toBe("otto");
    expect(resolveTarget("Google Shopping").platform.kind).toBe("comparison");
  });

  it("keeps country, language, currency and region apart", () => {
    const otto = buildLinks().links.get("otto");
    const de = otto.channels.find((row) => row.country === "DE");
    expect(de).toMatchObject({ currency: "EUR", languages: ["de"], region: "EU" });
    const ebay = buildLinks().links.get("ebay").channels.find((row) => row.country === "GB");
    expect(ebay).toMatchObject({ currency: "GBP", languages: ["en"], region: "GB" });
    const galaxus = buildLinks().links.get("galaxus").channels.find((row) => row.country === "CH");
    expect(galaxus.languages).toEqual(["de", "fr", "it"]);
    expect(galaxus.region).toBe("CH");
  });

  it("does not publish without a real marketplace category", () => {
    const missing = planListing({ platform: "Amazon", buzzardCategory: "bz.01", country: "DE", attributes: { sku: "BZ-1", title: "Disc" } });
    expect(missing).toMatchObject({ ok: false, code: "MARKETPLACE_CATEGORY_UNMAPPED", publish: false, live: false, productApi: false, orderApi: false });
    const unknown = planListing({ platform: "Amazon", buzzardCategory: "bz.20", country: "DE" });
    expect(unknown.code).toBe("CATEGORY_RETIRED");
    const absent = planListing({ platform: "Amazon", buzzardCategory: "bz.99", country: "DE" });
    expect(absent.code).toBe("CATEGORY_NOT_FOUND");
    const closed = planListing({
      platform: "Amazon",
      buzzardCategory: "bz.01",
      country: "DE",
      attributes: { sku: "BZ-1", title: "Disc" },
      marketplaceCategoryId: "merchant-supplied",
      marketplaceAttributesConfirmed: true,
    });
    expect(closed).toMatchObject({ ok: true, ready: true, code: "LIVE_PUBLISH_CLOSED", publish: false, live: false, network: false });
  });

  it("routes a part only to eligible channels and blocks the wrong kinds", () => {
    const routes = routesFor({ buzzardCategory: "bz.01" });
    const ids = routes.routes.map((row) => row.id);
    expect(ids).toContain("amazon");
    expect(ids).toContain("daparto");
    expect(ids).not.toContain("zooplus");
    expect(planListing({ platform: "Daparto", buzzardCategory: "bz.17", country: "DE" }).code).toBe("CATEGORY_NOT_ELIGIBLE");
    expect(planListing({ platform: "Idealo", buzzardCategory: "bz.12", country: "DE" }).code).toBe("COMPARISON_CHANNEL");
    expect(planListing({ platform: "Kleinanzeigen", buzzardCategory: "bz.01", country: "DE" }).code).toBe("CLASSIFIED_CHANNEL");
    expect(planListing({ platform: "Coolblue", buzzardCategory: "bz.12", country: "NL" }).code).toBe("RETAILER_NOT_A_MARKETPLACE");
    expect(planListing({ platform: "Autodoc", buzzardCategory: "bz.01", country: "DE" }).code).toBe("API_NOT_VERIFIED");
    expect(planListing({ platform: "Douglas Marketplace", buzzardCategory: "bz.17", country: "DE" }).code).toBe("CATEGORY_NOT_ELIGIBLE");
    expect(planListing({ platform: "Douglas Marketplace", buzzardCategory: "bz.21", country: "DE" }).code).toBe("MARKETPLACE_CATEGORY_UNMAPPED");
    const backMarket = planListing({
      platform: "Back Market",
      buzzardCategory: "bz.12",
      country: "FR",
      attributes: { sku: "BZ-1", title: "Phone" },
      marketplaceCategoryId: "merchant-supplied",
      marketplaceAttributesConfirmed: true,
    });
    expect(backMarket.code).toBe("CONDITION_REQUIRED");
  });
});
