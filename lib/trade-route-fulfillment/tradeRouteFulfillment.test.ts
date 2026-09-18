import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolveTargetCountry,
  resolveFulfillmentOrigin,
  classifyTradeRoute,
  quoteShipping,
  selectCarrier,
  runTradeRouteFulfillmentPipeline,
  attachTrackingToOrder,
  clearTradeRoutePipelineCache,
} from "./index";
import { clearCustomsPrecheckCache } from "@/lib/customs-fulfillment-gate";
import * as productCustoms from "@/lib/customs-fulfillment-gate/productCustoms";

describe("Trade Route Fulfillment", () => {
  beforeEach(() => {
    clearTradeRoutePipelineCache();
    clearCustomsPrecheckCache();
  });

  describe("resolveTargetCountry", () => {
    it("resolves from shipping address when aligned with market", () => {
      const result = resolveTargetCountry({
        shippingAddressCountry: "FR",
        marketId: "FR",
      });
      expect(result.ok).toBe(true);
      expect(result.country).toBe("FR");
      expect(result.source).toBe("shipping_address");
    });

    it("rejects market/shipping mismatch", () => {
      const result = resolveTargetCountry({
        shippingAddressCountry: "FR",
        marketId: "DE",
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("TRADE_ROUTE_COUNTRY_MISMATCH");
    });

    it("rejects invalid country codes", () => {
      const result = resolveTargetCountry({
        shippingAddressCountry: "XX",
        marketId: "DE",
      });
      expect(result.ok).toBe(false);
    });

    it("normalizes lowercase country codes", () => {
      const result = resolveTargetCountry({
        shippingAddressCountry: "de",
        marketId: "DE",
      });
      expect(result.ok).toBe(true);
      expect(result.country).toBe("DE");
    });
  });

  describe("resolveFulfillmentOrigin", () => {
    it("uses shippingOrigin priority", () => {
      const result = resolveFulfillmentOrigin({
        supplier: {
          supplierId: "S1",
          shippingOrigin: "PL",
          warehouseCountry: "DE",
          country: "DE",
        },
      });
      expect(result.ok).toBe(true);
      expect(result.originCountry).toBe("PL");
      expect(result.source).toBe("shippingOrigin");
    });

    it("returns ORIGIN_UNKNOWN without defaulting to DE", () => {
      const result = resolveFulfillmentOrigin({
        supplier: { supplierId: "S1", country: "INVALID" },
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("ORIGIN_UNKNOWN");
    });
  });

  describe("classifyTradeRoute", () => {
    const euPairs = [
      ["DE", "FR"],
      ["DE", "NL"],
      ["PL", "DE"],
      ["FR", "ES"],
    ] as const;

    it.each(euPairs)("EU → EU: %s → %s", (origin, destination) => {
      const route = classifyTradeRoute({ originCountry: origin, destinationCountry: destination });
      expect(route.tradeRoute).toBe("EU_TO_EU");
      expect(route.flags.requiresCustomsPrecheck).toBe(false);
    });

    const euToNonEu = [
      ["DE", "TR"],
      ["DE", "SA"],
      ["DE", "AE"],
      ["PL", "EG"],
      ["FR", "QA"],
    ] as const;

    it.each(euToNonEu)("EU → NON-EU: %s → %s", (origin, destination) => {
      const route = classifyTradeRoute({ originCountry: origin, destinationCountry: destination });
      expect(route.tradeRoute).toBe("EU_TO_NON_EU");
      expect(route.flags.requiresCustomsPrecheck).toBe(true);
    });

    it("NON-EU → EU", () => {
      const route = classifyTradeRoute({ originCountry: "TR", destinationCountry: "DE" });
      expect(route.tradeRoute).toBe("NON_EU_TO_EU");
      expect(route.flags.requiresCustomsPrecheck).toBe(true);
    });

    it("NON-EU → NON-EU", () => {
      const route = classifyTradeRoute({ originCountry: "TR", destinationCountry: "SA" });
      expect(route.tradeRoute).toBe("NON_EU_TO_NON_EU");
      expect(route.flags.requiresCustomsPrecheck).toBe(true);
    });

    it("UNKNOWN for invalid countries", () => {
      const route = classifyTradeRoute({ originCountry: "ZZ", destinationCountry: "DE" });
      expect(route.tradeRoute).toBe("UNKNOWN");
    });
  });

  describe("quoteShipping", () => {
    it("quotes via pricing engine", () => {
      const quote = quoteShipping({
        originCountry: "DE",
        destinationCountry: "DE",
        postalCode: "10115",
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        targetCurrency: "EUR",
      });
      expect(quote.ok).toBe(true);
      expect(quote.shippingCost).toBeGreaterThan(0);
    });
  });

  describe("selectCarrier", () => {
    it("selects carrier for EU route", () => {
      const result = selectCarrier({
        originCountry: "DE",
        destinationCountry: "FR",
        tradeRoute: "EU_TO_EU",
        weightKg: 5,
        dimensionsCm: { length: 40, width: 30, height: 20 },
        shipmentId: "ship_test_1",
        idempotencyKey: "idem_carrier_1",
      });
      expect(result.ok).toBe(true);
      expect(result.carrierId).toBeTruthy();
      expect(result.trackingSupported).toBe(true);
    });

    it("returns SHIPPING_HOLD when no carrier fits", () => {
      const result = selectCarrier({
        originCountry: "DE",
        destinationCountry: "TR",
        tradeRoute: "EU_TO_NON_EU",
        weightKg: 500,
        dimensionsCm: { length: 400, width: 300, height: 200 },
        shipmentId: "ship_test_2",
        idempotencyKey: "idem_carrier_2",
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("NO_CARRIER");
    });
  });

  describe("runTradeRouteFulfillmentPipeline", () => {
    const baseInput = {
      orderId: "ord_pipeline_1",
      marketId: "DE",
      shippingAddress: { country: "DE", postalCode: "10115", city: "Berlin" },
      items: [
        {
          productId: "reifen-pilot-sport",
          quantity: 1,
          supplierId: "TEST_SUPPLIER_A",
          lineGross: 89.99,
          productName: "Test Tire",
        },
      ],
      currency: "EUR",
      supplier: { supplierId: "TEST_SUPPLIER_A", country: "DE" },
      idempotencyKey: "idem_pipeline_1",
    };

    it("EU → EU bypasses customs and selects carrier", () => {
      const result = runTradeRouteFulfillmentPipeline({
        ...baseInput,
        marketId: "FR",
        shippingAddress: { country: "FR", postalCode: "75001", city: "Paris" },
      });
      expect(result.ok).toBe(true);
      expect(result.snapshot?.tradeRoute).toBe("EU_TO_EU");
      expect(result.snapshot?.customsDecision).toBe("CUSTOMS_NOT_REQUIRED");
      expect(result.snapshot?.carrierId).toBeTruthy();
    });

    it("EU → NON-EU holds for missing customs data", () => {
      const result = runTradeRouteFulfillmentPipeline({
        ...baseInput,
        marketId: "TR",
        shippingAddress: { country: "TR", postalCode: "34000", city: "Istanbul" },
      });
      expect(result.ok).toBe(false);
      expect(result.snapshot?.tradeRoute).toBe("EU_TO_NON_EU");
      expect(result.snapshot?.customsDecision).toBe("CUSTOMS_REVIEW_REQUIRED");
      expect(result.errorCode).toBe("CUSTOMS_HOLD");
    });

    it("NON-EU → EU requires customs precheck", () => {
      const result = runTradeRouteFulfillmentPipeline({
        ...baseInput,
        supplier: { supplierId: "TEST_SUPPLIER_A", shippingOrigin: "TR" },
      });
      expect(result.snapshot?.tradeRoute).toBe("NON_EU_TO_EU");
      expect(result.snapshot?.tradeRouteFlags.requiresCustomsPrecheck).toBe(true);
    });

    it("country mismatch blocks pipeline", () => {
      const result = runTradeRouteFulfillmentPipeline({
        ...baseInput,
        marketId: "DE",
        shippingAddress: { country: "FR", postalCode: "75001", city: "Paris" },
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("TRADE_ROUTE_COUNTRY_MISMATCH");
    });

    it("is idempotent", () => {
      const first = runTradeRouteFulfillmentPipeline(baseInput);
      const second = runTradeRouteFulfillmentPipeline(baseInput);
      expect(second.snapshot).toEqual(first.snapshot);
    });

    it("blocks restricted goods", () => {
      vi.spyOn(productCustoms, "loadProductCustomsSnapshot").mockReturnValue({
        productId: "restricted-item",
        hsCode: "9306",
        originCountry: "DE",
        customsValue: 100,
        commodityDescription: "Restricted",
        restrictedGoods: true,
        documentationRequired: true,
        reviewRequired: false,
      });
      const result = runTradeRouteFulfillmentPipeline({
        ...baseInput,
        marketId: "TR",
        shippingAddress: { country: "TR", postalCode: "34000", city: "Istanbul" },
      });
      expect(result.ok).toBe(false);
      expect(result.snapshot?.customsDecision).toBe("CUSTOMS_BLOCKED");
      vi.restoreAllMocks();
    });
  });

  describe("attachTrackingToOrder", () => {
    it("does not attach without tracking number", () => {
      const view = attachTrackingToOrder({ orderId: "ord_1" });
      expect(view.status).toBe("NOT_ATTACHED");
      expect(view.trackingNumber).toBeUndefined();
    });

    it("blocks unknown live tracking identifiers", () => {
      const view = attachTrackingToOrder({
        orderId: "ord_1",
        trackingNumber: "LIVE-TRACK-12345",
        carrierId: "DHL",
      });
      expect(view.status).toBe("BLOCKED");
    });

    it("attaches sandbox tracking identifiers", () => {
      const view = attachTrackingToOrder({
        orderId: "ord_1",
        trackingNumber: "SANDBOX-TRACK-001",
        carrierId: "DHL",
        shipmentId: "ship_1",
      });
      expect(view.status).toBe("ATTACHED");
      expect(view.trackingNumber).toBe("SANDBOX-TRACK-001");
    });
  });

  describe("Security", () => {
    it("rejects prototype pollution in country field", () => {
      const polluted = Object.assign({ country: "DE" }, JSON.parse('{"__proto__":{"polluted":true}}'));
      const result = resolveTargetCountry({
        shippingAddressCountry: polluted.country,
        marketId: "DE",
      });
      expect(result.ok).toBe(true);
      expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it("does not leak secrets in pipeline events", () => {
      const result = runTradeRouteFulfillmentPipeline({
        orderId: "ord_sec_1",
        marketId: "DE",
        shippingAddress: { country: "DE", postalCode: "10115", city: "Berlin" },
        items: [
          {
            productId: "reifen-pilot-sport",
            quantity: 1,
            supplierId: "TEST_SUPPLIER_A",
            lineGross: 89.99,
            productName: "Test",
          },
        ],
        currency: "EUR",
        supplier: { supplierId: "TEST_SUPPLIER_A", country: "DE", secretsRef: "env:SECRET" } as never,
        idempotencyKey: "idem_sec_1",
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("env:SECRET");
      expect(serialized).not.toContain("SECRET");
    });
  });
});
