import { describe, expect, it } from "vitest";
import { CHECKOUT_COUNTRIES, getCountry } from "./countries";
import { calculateShippingCost, calculateShippingCostForLines, SHIPPING_METHODS } from "./shipping";
import { calculateMarketShipping } from "@/lib/market/shipping";
import { getShippingCost } from "@/lib/products/format";

describe("checkout VAT and shipping stay unverified", () => {
  it("does not fill a missing country VAT rate with 19 or zero", () => {
    expect(CHECKOUT_COUNTRIES.length).toBeGreaterThan(0);
    for (const country of CHECKOUT_COUNTRIES) {
      expect(country.vatRate).toBeNull();
      expect(country.vatOfficial).toBe(false);
      expect(country.vatVerified).toBe(false);
      expect(country.vatSource).toBe("UNKNOWN");
    }
    expect(getCountry("DE")?.vatRate).toBeNull();
    expect(getCountry("ZZ")).toBeUndefined();
    expect(JSON.stringify(CHECKOUT_COUNTRIES)).not.toContain("\"vatRate\":19");
  });

  it("does not price standard or express shipping at 5.99 or 12.99", () => {
    expect(calculateShippingCost()).toBeNull();
    expect(calculateShippingCostForLines()).toBeNull();
    expect(calculateMarketShipping()).toBeNull();
    expect(getShippingCost(120)).toBeNull();
    expect(SHIPPING_METHODS.map((method) => method.baseCost)).toEqual([null, null]);
    expect(JSON.stringify(SHIPPING_METHODS)).not.toContain("5.99");
    expect(JSON.stringify(SHIPPING_METHODS)).not.toContain("12.99");
  });
});
