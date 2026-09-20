import { describe, it, expect } from "vitest";
import { buildMarketplaceProductionCapabilityMatrix, MARKETPLACE_CAPABILITIES } from "./productionCapabilityMatrix";

describe("marketplace production capability matrix", () => {
  it("builds cells for core marketplaces", () => {
    const cells = buildMarketplaceProductionCapabilityMatrix();
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.some((c) => c.marketplaceId === "amazon" && c.capability === "AUTH")).toBe(true);
    expect(MARKETPLACE_CAPABILITIES).toContain("ORDER_IMPORT");
  });
});
