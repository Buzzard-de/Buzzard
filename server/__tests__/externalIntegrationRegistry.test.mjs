import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createExternalIntegrationRegistry } = require("../lib/externalIntegrationRegistry.js");

const suppliers = [
  { id: "mock", name: "Mock Supplier", format: "mock", credentialsConfigured: false },
  { id: "api-supplier-dry", name: "API Supplier (Dry-Run)", format: "api", credentialsConfigured: false },
];
const marketplaces = [
  { code: "amazon", name: "Amazon" },
  { code: "ebay", name: "eBay" },
];

describe("external integration registry", () => {
  it("discovers real supplier and marketplace connectors and their capabilities", () => {
    const registry = createExternalIntegrationRegistry({
      listSuppliers: () => suppliers,
      listMarketplaces: () => marketplaces,
    });
    expect(registry.suppliers().map((s) => s.id)).toEqual(["mock", "api-supplier-dry"]);
    expect(registry.marketplaces().map((m) => m.id)).toEqual(["amazon", "ebay"]);
    expect(registry.getSupplier("api-supplier-dry").capabilities.PRODUCT_READ).toBe(true);
    expect(registry.getSupplier("api-supplier-dry").capabilities.ORDER_WRITE).toBe(false);
    expect(registry.getMarketplace("amazon").capabilities.ORDER_WRITE).toBe(false);
    expect(registry.getMarketplace("amazon").capabilities.LISTING_READ).toBe(true);
    expect(registry.getSupplier("missing")).toBeNull();
  });
});
