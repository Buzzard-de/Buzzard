import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const carriers = require("../lib/software/carriers.js");
const shippingProvider = require("../lib/commerce/shippingProvider.js");

describe("carrier label purchase fail-closed", () => {
  it("blocks label purchase for every classified carrier even if env keys exist", () => {
    const prev = process.env.DHL_API_KEY;
    process.env.DHL_API_KEY = "not-a-live-key";
    for (const id of ["dhl", "dpd", "gls", "hermes", "ups"]) {
      const bought = carriers.purchaseLabel({ carrier: id, orderId: "ord-nope" });
      expect(bought.ok).toBe(false);
      expect(bought.purchased).toBe(false);
      expect(bought.live).toBe(false);
      expect(bought.labelUrl).toBeNull();
      expect(bought.amountCharged).toBe(0);
      expect(bought.reason).toBe("LABEL_PURCHASE_BLOCKED");
      const created = carriers.createShipment({ carrier: id });
      expect(created.created).toBe(false);
      expect(created.reason).toBe("SHIPMENT_CREATE_BLOCKED");
    }
    if (prev === undefined) delete process.env.DHL_API_KEY;
    else process.env.DHL_API_KEY = prev;
  });

  it("keeps local shipping quotes as dry-run rates", () => {
    const quote = shippingProvider.calculateShipping({ methodId: "standard", country: "DE" });
    expect(quote.dryRun).toBe(true);
    expect(quote.live).toBe(false);
    expect(quote.liveRate).toBe(false);
    expect(quote.shipmentCreated).toBe(false);
  });
});
