import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrderSot } = require("../lib/sot/orderSot.js");
const { ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");

describe("order SoT", () => {
  it("accepts order-engine writes and marketplace ingestion, blocks supplier, and locks external sales", () => {
    const sot = createOrderSot({
      env: { BUZZARD_SALES_ENABLED: "0" },
      logAudit: () => {},
    });
    expect(sot.assertOrderWrite({ actor: ACTORS.ORDER_ENGINE }).ok).toBe(true);
    const ingested = sot.ingestMarketplaceOrder({ marketplaceOrderId: "m-1", correlationId: "corr_order" });
    expect(ingested.ok).toBe(true);
    expect(ingested.externalSideEffect).toBe(false);
    expect(ingested.correlationId).toBe("corr_order");
    expect(() => sot.createOrder({ actor: ACTORS.SUPPLIER })).toThrow(/cannot write/);
    expect(() =>
      sot.createOrder({ actor: ACTORS.ORDER_ENGINE, externalSideEffect: true })
    ).toThrow(/SALES_LOCKED/);
  });
});
