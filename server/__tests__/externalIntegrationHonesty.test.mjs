import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("external integration inventory honesty", () => {
  it("classifies Inter-Cars and TecDoc without claiming live verification", () => {
    const software = require("../lib/software");
    const inventory = software.externalIntegrations.inventory();
    expect(inventory.liveReady).toBe(false);
    expect(inventory.productionVerified).toBe(false);
    expect(inventory.secretsIncluded).toBe(false);
    const ids = inventory.items.map((item) => item.id);
    expect(ids).toContain("inter_cars");
    expect(ids).toContain("tecdoc");
    const inter = inventory.items.find((item) => item.id === "inter_cars");
    expect(inter.live).toBe(false);
    expect(inter.blocked).toBe(true);
    expect(inter.operationallyVerified).toBe(false);
    expect(inter.purchaseOrderSent).toBe(false);
    const tecdoc = inventory.items.find((item) => item.id === "tecdoc");
    expect(tecdoc.live).toBe(false);
    const suppliers = software.connectorInventory.supplierConnectors();
    expect(suppliers.some((row) => row.id === "inter_cars" && row.live === "BLOCKED_EXTERNAL_DEPENDENCY")).toBe(true);
  });

  it("treats TecDoc and Inter-Cars keys as presence-only and never opens HTTP", async () => {
    const prevTecdoc = process.env.TECDOC_API_KEY;
    const prevIc = process.env.INTERCARS_API_KEY;
    process.env.TECDOC_API_KEY = "not-a-live-key";
    process.env.INTERCARS_API_KEY = "not-a-live-key";
    try {
      const tecdoc = require("../lib/adapters/tecdocAdapter");
      const interCars = require("../lib/adapters/interCarsAdapter");
      const catalog = await tecdoc.fetchCatalog();
      expect(catalog.live).toBe(false);
      expect(catalog.mock).toBe(true);
      expect(catalog.httpAttempted).toBe(false);
      expect(catalog.keyPresent).toBe(true);
      expect(JSON.stringify(catalog)).not.toContain("not-a-live-key");
      const rejectedCatalog = await tecdoc.fetchCatalog({ vendorCatalogId: "td-live-1" });
      expect(rejectedCatalog.reason).toBe("VENDOR_CATALOG_ID_REJECTED");
      expect(rejectedCatalog.httpAttempted).toBe(false);
      const tecdocStock = await tecdoc.fetchStock();
      expect(tecdocStock.live).toBe(false);
      expect(tecdocStock.inventedStock).toBe(false);
      expect(tecdocStock.httpAttempted).toBe(false);
      const prices = await tecdoc.fetchPrices();
      expect(prices.inventedPrice).toBe(false);
      expect(prices.httpAttempted).toBe(false);
      const liveCatalog = tecdoc.confirmLiveCatalog();
      expect(liveCatalog.reason).toBe("LIVE_TECDOC_UNKNOWN");
      expect(liveCatalog.httpAttempted).toBe(false);
      const po = interCars.purchaseOrder();
      expect(po.sent).toBe(false);
      expect(po.live).toBe(false);
      expect(po.httpAttempted).toBe(false);
      expect(po.reason).toBe("LIVE_PO_BLOCKED");
      expect(po.keyPresent).toBe(true);
      expect(JSON.stringify(po)).not.toContain("not-a-live-key");
      const lookup = interCars.lookupArticle({ sku: "IC-1", vendorStock: 99 });
      expect(lookup.live).toBe(false);
      expect(lookup.httpAttempted).toBe(false);
      expect(lookup.inStock).toBe(false);
      expect(lookup.inventedStock).toBe(false);
      expect(lookup.vendorStockIgnored).toBe(true);

      const icStock = interCars.confirmAvailability({ sku: "IC-1" });
      expect(icStock.reason).toBe("LIVE_STOCK_UNKNOWN");
      expect(icStock.inStock).toBe(false);
      expect(icStock.httpAttempted).toBe(false);

      const rejected = interCars.purchaseOrder({ vendorPoId: "ic-live-1" });
      expect(rejected.reason).toBe("VENDOR_PO_ID_REJECTED");
      expect(rejected.purchaseOrderId).toBe(null);
      expect(rejected.httpAttempted).toBe(false);

      const ai = interCars.purchaseOrder({ actor: "pusat", forcePurchase: true });
      expect(ai.reason).toBe("SELF_APPROVE_DENIED");
      expect(ai.sent).toBe(false);

      const forced = interCars.purchaseOrder({ actor: "operator", forcePurchase: true });
      expect(forced.reason).toBe("LIVE_PO_BLOCKED");
      expect(forced.forcePurchaseIgnored).toBe(true);
      expect(forced.inventedPoId).toBe(false);
    } finally {
      if (prevTecdoc === undefined) delete process.env.TECDOC_API_KEY;
      else process.env.TECDOC_API_KEY = prevTecdoc;
      if (prevIc === undefined) delete process.env.INTERCARS_API_KEY;
      else process.env.INTERCARS_API_KEY = prevIc;
    }
  });
});
