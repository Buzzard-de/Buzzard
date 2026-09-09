import { describe, it, expect } from "vitest";
import {
  calculateDisplayPrice,
  getDefaultMarket,
  getEligibleSupplierRegions,
  getMarket,
  getMarketCurrency,
  getMarketLanguages,
  getMarketPaymentCapabilities,
  getMarketRegistryCount,
  getMarketShippingRegion,
  getMarketplaces,
  getMarketVat,
  getVatContext,
  isEuCountry,
  isProductAvailableInMarket,
  validateMarketRegistry,
} from "./index";

const TEST_MARKETS = ["DE", "FR", "IT", "ES", "PL", "NL", "TR", "SA", "AE", "EG"] as const;

describe("International Market Engine — registry", () => {
  it("loads all 35 markets from global_countries_35.json", () => {
    const result = validateMarketRegistry();
    expect(result.valid).toBe(true);
    expect(result.count).toBe(35);
    expect(getMarketRegistryCount()).toBe(35);
  });

  it("default market is Germany", () => {
    expect(getDefaultMarket().countryCode).toBe("DE");
  });
});

describe("International Market Engine — market detection", () => {
  for (const code of TEST_MARKETS) {
    it(`resolves market ${code}`, () => {
      const market = getMarket(code);
      expect(market).toBeDefined();
      expect(market!.countryCode).toBe(code);
      expect(market!.currency).toBeTruthy();
    });
  }
});

describe("International Market Engine — language integration", () => {
  it("Germany supports de and extensions", () => {
    expect(getMarketLanguages("DE")).toContain("de");
  });

  it("France default language is fr", () => {
    expect(getMarket("FR")!.defaultLanguage).toBe("fr");
  });

  it("Turkey default language is tr", () => {
    expect(getMarket("TR")!.defaultLanguage).toBe("tr");
  });

  it("Saudi Arabia is RTL with ar", () => {
    const sa = getMarket("SA")!;
    expect(sa.defaultLanguage).toBe("ar");
    expect(sa.textDirection).toBe("rtl");
  });
});

describe("International Market Engine — currency", () => {
  it("Germany uses EUR", () => {
    expect(getMarketCurrency("DE").code).toBe("EUR");
  });

  it("Poland uses PLN", () => {
    expect(getMarketCurrency("PL").code).toBe("PLN");
  });

  it("Turkey uses TRY", () => {
    expect(getMarketCurrency("TR").code).toBe("TRY");
  });

  it("Saudi Arabia uses SAR", () => {
    expect(getMarketCurrency("SA").code).toBe("SAR");
  });

  it("Egypt uses EGP", () => {
    expect(getMarketCurrency("EG").code).toBe("EGP");
  });

  it("formats price with Intl.NumberFormat", () => {
    const result = calculateDisplayPrice({ amount: 99.99, currency: "EUR", locale: "de-DE" }, { countryCode: "DE" });
    expect(result.formatted).toMatch(/99,99|99\.99/);
    expect(result.currency).toBe("EUR");
  });
});

describe("International Market Engine — VAT context", () => {
  it("B2C domestic Germany applies DE VAT", () => {
    const ctx = getVatContext({ sellerCountry: "DE", buyerCountry: "DE", customerType: "B2C" });
    expect(ctx.rate).toBe(getMarketVat("DE").standardRate);
    expect(ctx.included).toBe(true);
    expect(ctx.reverseCharge).toBe(false);
    expect(ctx.reason).toBe("B2C_DOMESTIC");
  });

  it("B2B intra-EU with VAT ID triggers reverse charge", () => {
    const ctx = getVatContext({
      sellerCountry: "DE",
      buyerCountry: "FR",
      customerType: "B2B",
      vatId: "FR12345678901",
    });
    expect(ctx.reverseCharge).toBe(true);
    expect(ctx.rate).toBe(0);
    expect(ctx.reason).toBe("B2B_INTRA_EU_REVERSE_CHARGE");
  });

  it("B2C intra-EU uses destination VAT", () => {
    const ctx = getVatContext({ sellerCountry: "DE", buyerCountry: "FR", customerType: "B2C" });
    expect(ctx.rate).toBe(getMarketVat("FR").standardRate);
    expect(ctx.reason).toBe("B2C_INTRA_EU_DESTINATION");
  });

  it("EU to non-EU export", () => {
    const ctx = getVatContext({ sellerCountry: "DE", buyerCountry: "TR", customerType: "B2C" });
    expect(isEuCountry("DE")).toBe(true);
    expect(isEuCountry("TR")).toBe(false);
    expect(ctx.reason).toMatch(/EXPORT|CROSS_BORDER/);
  });

  it("non-EU to EU import", () => {
    const ctx = getVatContext({ sellerCountry: "TR", buyerCountry: "DE", customerType: "B2C" });
    expect(ctx.rate).toBe(getMarketVat("DE").standardRate);
  });
});

describe("International Market Engine — shipping region", () => {
  it("Germany → EU Central", () => {
    expect(getMarketShippingRegion("DE")).toBe("EU_CENTRAL");
  });

  it("France → EU West", () => {
    expect(getMarketShippingRegion("FR")).toBe("EU_WEST");
  });

  it("Poland → EU East", () => {
    expect(getMarketShippingRegion("PL")).toBe("EU_EAST");
  });

  it("Turkey → Non-EU", () => {
    expect(getMarketShippingRegion("TR")).toBe("NON_EU");
  });

  it("Saudi Arabia → GCC", () => {
    expect(getMarketShippingRegion("SA")).toBe("GCC");
  });

  it("Egypt → MENA", () => {
    expect(getMarketShippingRegion("EG")).toBe("MENA");
  });
});

describe("International Market Engine — payment capabilities", () => {
  it("Germany EU payment methods", () => {
    const caps = getMarketPaymentCapabilities("DE");
    expect(caps).toContain("card");
    expect(caps).toContain("sepa");
    expect(caps).toContain("paypal");
  });

  it("Turkey card only (capability layer)", () => {
    const caps = getMarketPaymentCapabilities("TR");
    expect(caps).toEqual(["card"]);
  });
});

describe("International Market Engine — marketplace capabilities", () => {
  it("Germany marketplaces are supported not active", () => {
    const mps = getMarketplaces("DE");
    expect(mps.length).toBeGreaterThan(0);
    expect(mps.every((m) => m.status === "supported")).toBe(true);
  });

  it("France includes Cdiscount", () => {
    expect(getMarketplaces("FR").some((m) => m.id === "cdiscount")).toBe(true);
  });

  it("Poland includes Allegro", () => {
    expect(getMarketplaces("PL").some((m) => m.id === "allegro")).toBe(true);
  });

  it("Netherlands includes bol.com", () => {
    expect(getMarketplaces("NL").some((m) => m.id === "bol")).toBe(true);
  });
});

describe("International Market Engine — supplier region", () => {
  it("EU customer prefers EU supplier", () => {
    expect(getEligibleSupplierRegions("DE")).toContain("EU");
    expect(getEligibleSupplierRegions("DE")[0]).toBe("EU");
  });

  it("GCC customer prefers GCC with EU fallback", () => {
    const regions = getEligibleSupplierRegions("SA");
    expect(regions[0]).toBe("GCC");
    expect(regions).toContain("EU");
  });

  it("Turkey prefers TR with EU fallback", () => {
    const regions = getEligibleSupplierRegions("TR");
    expect(regions[0]).toBe("TR");
    expect(regions).toContain("EU");
  });

  it("Egypt prefers MENA with EU fallback", () => {
    const regions = getEligibleSupplierRegions("EG");
    expect(regions[0]).toBe("MENA");
    expect(regions).toContain("EU");
  });
});

describe("International Market Engine — product availability", () => {
  it("available when country flag is true", () => {
    const result = isProductAvailableInMarket(
      { countryAvailability: { DE: true, FR: true } },
      "DE"
    );
    expect(result.available).toBe(true);
    expect(result.status).toBe("AVAILABLE");
  });

  it("blocked when country restricted", () => {
    const result = isProductAvailableInMarket(
      { countryAvailability: { DE: false } },
      "DE"
    );
    expect(result.available).toBe(false);
    expect(result.status).toBe("BLOCKED");
  });

  it("review required when availability unknown", () => {
    const result = isProductAvailableInMarket({}, "DE");
    expect(result.status).toBe("REVIEW_REQUIRED");
  });
});

describe("International Market Engine — price engine", () => {
  it("avoids floating point drift with integer cents", () => {
    const result = calculateDisplayPrice(
      { amount: 19.99, currency: "EUR", priceIncludesVat: true },
      { countryCode: "DE", customerType: "B2C" }
    );
    expect(result.netPrice + result.vatAmount).toBeCloseTo(19.99, 2);
    expect(result.grossPrice).toBe(19.99);
  });

  it("B2B reverse charge yields zero VAT", () => {
    const result = calculateDisplayPrice(
      { amount: 100, currency: "EUR", priceIncludesVat: false },
      { countryCode: "FR", sellerCountry: "DE", customerType: "B2B", vatId: "FR12345678901" }
    );
    expect(result.vatAmount).toBe(0);
  });
});
