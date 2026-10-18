import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const software = require("../lib/software");
const commercial = require("../lib/commercialIntegrations");

describe("carrier adapters — established fail-closed (no live labels)", () => {
  it("DHL/DPD/GLS/Hermes/UPS never purchase labels or book pickups when keys are present", () => {
    const prev = {
      DHL_API_KEY: process.env.DHL_API_KEY,
      DPD_API_KEY: process.env.DPD_API_KEY,
      GLS_API_KEY: process.env.GLS_API_KEY,
      HERMES_API_KEY: process.env.HERMES_API_KEY,
      UPS_API_KEY: process.env.UPS_API_KEY,
    };
    process.env.DHL_API_KEY = "presence-only";
    process.env.DPD_API_KEY = "presence-only";
    process.env.GLS_API_KEY = "presence-only";
    process.env.HERMES_API_KEY = "presence-only";
    process.env.UPS_API_KEY = "presence-only";
    try {
      for (const id of ["dhl", "dpd", "gls", "hermes", "ups"]) {
        const bought = software.carriers.purchaseLabel({ carrier: id });
        expect(bought.purchased).toBe(false);
        expect(bought.credentialsPresent).toBe(true);
        expect(bought.reason).toBe("LABEL_PURCHASE_BLOCKED");
        expect(software.carriers.createShipment({ carrier: id }).created).toBe(false);
        expect(software.carriers.classify(id).live).toBe(false);
        expect(software.carriers.classify(id).shipmentCreated).toBe(false);
      }
      expect(software.carriers.confirmLiveLabel().liveVerified).toBe(false);
      expect(software.carriers.bookPickup().booked).toBe(false);
      expect(software.carriers.cancelPickup().cancelled).toBe(false);
      expect(software.carriers.trackLive().httpAttempted).toBe(false);
      expect(software.carriers.inboundWebhook().reason).toBe("CARRIER_INBOUND_WEBHOOK_BLOCKED");
      expect(software.carrierWebhooks.inboundDeliveryWebhook().labelCreated).toBe(false);
      const quote = software.carriers.quoteRate({ methodId: "standard", country: "DE" });
      expect(quote.liveRate).toBe(false);
      expect(quote.carrierHttp).toBe(false);
      expect(quote.source).toBe("local_table");
      expect(software.carriers.health().labelPurchaseEnabled).toBe(false);
    } finally {
      for (const [key, value] of Object.entries(prev)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("commercial carrier adapters return blocked stubs without tracking numbers", async () => {
    const result = await commercial.carriers.dhl({ orderNumber: "x", countryCode: "DE", weightKg: 1, address: {} });
    expect(result.live).toBe(false);
    expect(result.trackingNumber).toBeNull();
    expect(result.reason).toBe("LABEL_PURCHASE_BLOCKED");
    expect(commercial.carriers.hermes).toBeTypeOf("function");
  });
});
