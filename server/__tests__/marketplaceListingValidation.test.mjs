import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateMarketplaceListing } = require("../lib/storefront/merchantFeedService.js");

describe("marketplace listing validation", () => {
  it("accepts a well-formed dry listing", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const row = validateMarketplaceListing({
      sku: "LIST-001",
      title: "Brake pad set",
      gtin: "5901234123457",
      mpn: "P85073",
      image_link: "https://cdn.test-supplier.example.de/p85073.jpg",
    });
    expect(row.ok).toBe(true);
    expect(row.publishAllowed).toBe(false);
  });

  it("rejects missing identifiers", () => {
    const row = validateMarketplaceListing({ sku: "X", title: "Bad" });
    expect(row.ok).toBe(false);
    expect(row.issues.length).toBeGreaterThan(0);
  });
});