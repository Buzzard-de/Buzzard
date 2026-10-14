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
});
