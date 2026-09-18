import { describe, it, expect, beforeEach, vi } from "vitest";
import { classifyTradeRoute } from "@/lib/trade-route-fulfillment";
import { runCustomsPrecheck, clearCustomsPrecheckCache } from "./precheck";
import * as productCustoms from "./productCustoms";

describe("Customs Fulfillment Gate", () => {
  beforeEach(() => {
    clearCustomsPrecheckCache();
    vi.restoreAllMocks();
  });

  it("EU → EU returns CUSTOMS_NOT_REQUIRED", () => {
    const route = classifyTradeRoute({ originCountry: "DE", destinationCountry: "FR" });
    const result = runCustomsPrecheck({
      orderId: "ord_customs_1",
      idempotencyKey: "idem_customs_1",
      tradeRoute: route,
      supplierOrigin: "DE",
      items: [{ productId: "reifen-pilot-sport", quantity: 1, lineGross: 89.99, productName: "Tire" }],
    });
    expect(result.decision).toBe("CUSTOMS_NOT_REQUIRED");
    expect(result.hold).toBe(false);
  });

  it("missing HS code → CUSTOMS_REVIEW_REQUIRED", () => {
    const route = classifyTradeRoute({ originCountry: "DE", destinationCountry: "TR" });
    const result = runCustomsPrecheck({
      orderId: "ord_customs_2",
      idempotencyKey: "idem_customs_2",
      tradeRoute: route,
      supplierOrigin: "DE",
      items: [{ productId: "reifen-pilot-sport", quantity: 1, lineGross: 89.99, productName: "Tire" }],
    });
    expect(result.decision).toBe("CUSTOMS_REVIEW_REQUIRED");
    expect(result.missingFields).toContain("hsCode");
    expect(result.hold).toBe(true);
  });

  it("complete customs data → CUSTOMS_READY", () => {
    vi.spyOn(productCustoms, "loadProductCustomsSnapshot").mockReturnValue({
      productId: "complete-item",
      hsCode: "4011",
      originCountry: "DE",
      customsValue: 89.99,
      commodityDescription: "Tire",
      restrictedGoods: false,
      documentationRequired: false,
      reviewRequired: false,
    });
    const route = classifyTradeRoute({ originCountry: "DE", destinationCountry: "TR" });
    const result = runCustomsPrecheck({
      orderId: "ord_customs_3",
      idempotencyKey: "idem_customs_3",
      tradeRoute: route,
      supplierOrigin: "DE",
      items: [{ productId: "complete-item", quantity: 1, lineGross: 89.99, productName: "Tire" }],
    });
    expect(result.decision).toBe("CUSTOMS_READY");
    expect(result.hold).toBe(false);
    expect(result.dutyEstimate).toBeGreaterThan(0);
  });

  it("restricted product → CUSTOMS_BLOCKED", () => {
    vi.spyOn(productCustoms, "loadProductCustomsSnapshot").mockReturnValue({
      productId: "blocked-item",
      hsCode: "9306",
      originCountry: "DE",
      customsValue: 100,
      commodityDescription: "Restricted",
      restrictedGoods: true,
      documentationRequired: true,
      reviewRequired: false,
    });
    const route = classifyTradeRoute({ originCountry: "DE", destinationCountry: "SA" });
    const result = runCustomsPrecheck({
      orderId: "ord_customs_4",
      idempotencyKey: "idem_customs_4",
      tradeRoute: route,
      supplierOrigin: "DE",
      items: [{ productId: "blocked-item", quantity: 1, lineGross: 100, productName: "Restricted" }],
    });
    expect(result.decision).toBe("CUSTOMS_BLOCKED");
    expect(result.hold).toBe(true);
  });

  it("UNKNOWN route → hold", () => {
    const route = classifyTradeRoute({ originCountry: "ZZ", destinationCountry: "DE" });
    const result = runCustomsPrecheck({
      orderId: "ord_customs_5",
      idempotencyKey: "idem_customs_5",
      tradeRoute: route,
      supplierOrigin: "ZZ",
      items: [{ productId: "reifen-pilot-sport", quantity: 1, lineGross: 89.99, productName: "Tire" }],
    });
    expect(result.decision).toBe("CUSTOMS_BLOCKED");
    expect(result.hold).toBe(true);
  });

  it("is idempotent", () => {
    const route = classifyTradeRoute({ originCountry: "DE", destinationCountry: "TR" });
    const input = {
      orderId: "ord_customs_6",
      idempotencyKey: "idem_customs_6",
      tradeRoute: route,
      supplierOrigin: "DE",
      items: [{ productId: "reifen-pilot-sport", quantity: 1, lineGross: 89.99, productName: "Tire" }],
    };
    expect(runCustomsPrecheck(input)).toEqual(runCustomsPrecheck(input));
  });
});
