import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHECKOUT_COUNTRIES, getCountry } from "./countries";
import { calculateShippingCost, calculateShippingCostForLines, SHIPPING_METHODS } from "./shipping";
import { calculateMarketShipping } from "@/lib/market/shipping";
import { getDeliverableMarketCountries } from "@/lib/market/countries";
import { getDeliveryEstimate } from "@/lib/market/delivery";
import { translate } from "@/lib/i18n/translations";
import { formatVatInfo, getShippingCost } from "@/lib/products/format";
import { estimateDestinationTax, formatTaxRatePercent, getMarketTaxRate } from "@/lib/market/tax";
import overlay from "@/data/global/market_country_overlay.json";

const DAY_RANGE = /\d+\s*[–-]\s*\d+|Werktage|business days/i;

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

  it("matches the published postcode shape for the remaining EU members", () => {
    const cases = [
      { code: "BG", valid: ["1000"], invalid: ["100", "10000", "BG-1000"] },
      { code: "HR", valid: ["HR-10000", "hr-10000"], invalid: ["10000", "HR-1000"] },
      { code: "CY", valid: ["CY-1010", "cy-1010"], invalid: ["1010", "CY-10101"] },
      { code: "EE", valid: ["10111"], invalid: ["1011", "EE-10111"] },
      { code: "GR", valid: ["105 63", "10563"], invalid: ["1056", "105 6A"] },
      { code: "LV", valid: ["LV-1050", "lv-1050"], invalid: ["1050", "LV-10501"] },
      { code: "LT", valid: ["LT-01100", "lt-01100"], invalid: ["01100", "LT-0110"] },
      { code: "LU", valid: ["L-1234", "l-1234"], invalid: ["1234", "LU-1234"] },
      { code: "MT", valid: ["VLT 1117", "vlt1117"], invalid: ["VL 1117", "VLT 111"] },
      { code: "SK", valid: ["811 01", "81101"], invalid: ["8110", "SK-81101"] },
      { code: "SI", valid: ["1000"], invalid: ["100", "10000", "SI-1000"] },
    ];
    for (const item of cases) {
      const country = getCountry(item.code);
      expect(country, item.code).toBeDefined();
      expect(country?.vatRate).toBeNull();
      expect(country?.vatSource).toBe("UNKNOWN");
      for (const zip of item.valid) expect(country?.zipPattern.test(zip), `${item.code} ${zip}`).toBe(true);
      for (const zip of item.invalid) expect(country?.zipPattern.test(zip), `${item.code} ${zip}`).toBe(false);
    }
    expect(getCountry("DE")?.zipPattern.test("10115")).toBe(true);
    expect(getCountry("DE")?.zipPattern.test("1011")).toBe(false);
  });

  it("does not price standard or express shipping at 5.99 or 12.99", () => {
    expect(calculateShippingCost()).toBeNull();
    expect(calculateShippingCostForLines()).toBeNull();
    expect(calculateMarketShipping()).toBeNull();
    expect(getShippingCost(120)).toBeNull();
    expect(SHIPPING_METHODS.map((method) => method.baseCost)).toEqual([null, null]);
    expect(JSON.stringify(SHIPPING_METHODS)).not.toContain("5.99");
    expect(JSON.stringify(SHIPPING_METHODS)).not.toContain("12.99");
    expect(SHIPPING_METHODS.map((method) => method.etaDays)).toEqual(["UNKNOWN", "UNKNOWN"]);
  });

  it("shows UNKNOWN instead of an unverified delivery day range", () => {
    const codes = ["DE", "AT", "BG", "HR", "CY", "EE", "GR", "LV", "LT", "LU", "MT", "SK", "SI", "FR", "ZZ"];
    for (const code of codes) {
      expect(getDeliveryEstimate(code)).toBe("UNKNOWN");
    }
    for (const country of getDeliverableMarketCountries()) {
      expect(country.deliveryDays).toBe("UNKNOWN");
      expect(country.deliveryDays).not.toMatch(DAY_RANGE);
    }
    expect(JSON.stringify(overlay)).not.toContain("deliveryDays");
    expect(overlay.DE.taxRate).toBe(0.19);
    expect(overlay.BG.taxRate).toBe(0.2);
    const shown = translate("de", "checkout.deliveryEstimate").replace("{estimate}", getDeliveryEstimate("DE"));
    expect(shown).toBe("Voraussichtliche Lieferung: UNKNOWN");
    expect(shown).not.toMatch(DAY_RANGE);
    const form = readFileSync(resolve("components/CheckoutForm.tsx"), "utf8");
    expect(form).toContain("getDeliveryEstimate(countryCode)");
    expect(form).not.toContain("deliveryDays");
    expect(form).not.toMatch(DAY_RANGE);
  });

  it("does not apply the removed 19 percent checkout fallback or an overlay label", () => {
    expect(getMarketTaxRate("DE")).toBeNull();
    expect(getMarketTaxRate("BG")).toBeNull();
    expect(getMarketTaxRate("")).toBeNull();
    expect(getMarketTaxRate("ZZ")).toBeNull();
    expect(estimateDestinationTax(100, "DE")).toBeNull();
    expect(estimateDestinationTax(0, "FR")).toBeNull();
    expect(formatTaxRatePercent("DE")).toBe("UNKNOWN");
    expect(formatVatInfo(119, 19, "de")).toContain("UNKNOWN");
    expect(formatVatInfo(119, 19, "de")).not.toContain("19");
  });
});
