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
      const po = interCars.purchaseOrder();
      expect(po.sent).toBe(false);
      expect(po.live).toBe(false);
      expect(po.httpAttempted).toBe(false);
      expect(po.reason).toBe("LIVE_PO_BLOCKED");
      expect(po.keyPresent).toBe(true);
      expect(JSON.stringify(po)).not.toContain("not-a-live-key");
      const lookup = interCars.lookupArticle({ sku: "IC-1" });
      expect(lookup.live).toBe(false);
      expect(lookup.httpAttempted).toBe(false);
    } finally {
      if (prevTecdoc === undefined) delete process.env.TECDOC_API_KEY;
      else process.env.TECDOC_API_KEY = prevTecdoc;
      if (prevIc === undefined) delete process.env.INTERCARS_API_KEY;
      else process.env.INTERCARS_API_KEY = prevIc;
    }
  });
});
