import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { AB27, getStandardVat, estimateVat } = require("../lib/commerce/ab27Tax.js");
const { screenTrade, quoteLane } = require("../lib/commerce/ab27Logistics.js");
const { stackCosts, profit } = require("../lib/commerce/marginEngine.js");

describe("AB27 tax and logistics", () => {
  it("covers 27 member states and blocks unknown VAT", () => {
    expect(AB27).toHaveLength(27);
    expect(getStandardVat("DE")).toBe(19);
    expect(getStandardVat("HU")).toBe(27);
    expect(estimateVat({ country: "US", netAmount: 100 }).blocked).toBe(true);
    expect(estimateVat({ country: "DE", netAmount: 100 }).vat).toBe(19);
  });

  it("never auto-clears sanctions and holds high-value or extra-EU lanes", () => {
    const intra = screenTrade({ destination: "FR", value: 120 });
    expect(intra.sanctionsCleared).toBe(false);
    expect(intra.status).toBe("INTRA_EU_ESTIMATE");
    const high = screenTrade({ destination: "DE", value: 20000 });
    expect(high.status).toBe("HUMAN_REVIEW");
    const outside = screenTrade({ destination: "US", value: 50 });
    expect(outside.status).toBe("HUMAN_REVIEW");
  });

  it("keeps unreimbursed returns out of realized profit", () => {
    const costs = stackCosts({
      supplierCost: 40,
      shippingCost: 6,
      marketplaceFee: 8,
      returnReserve: 3,
      country: "DE",
    });
    expect(costs.taxConnect.status).toBe("NOT_CONNECTED");
    const realized = profit({ sellGross: 100, costs, returnOccurred: true, supplierReimbursedReturn: false });
    expect(realized.realized).toBeNull();
    expect(realized.estimated).toEqual(expect.any(Number));
    expect(quoteLane({ destination: "IT", weightKg: 2 }).liveCarrier).toBe(false);
  });
});
