import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const marketEngine = require("../core/marketEngineRegistry.js");

const TEST_MARKETS = ["DE", "FR", "IT", "ES", "PL", "NL", "TR", "SA", "AE", "EG"];

describe("Server Market Engine Registry", () => {
  it("loads 35 markets", () => {
    const validation = marketEngine.validateMarketRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.count).toBe(35);
    expect(marketEngine.getMarketRegistryCount()).toBe(35);
  });

  for (const code of TEST_MARKETS) {
    it(`resolves ${code}`, () => {
      const market = marketEngine.getMarket(code);
      expect(market).toBeTruthy();
      expect(market.countryCode).toBe(code);
    });
  }

  it("validates market requests server-side", () => {
    expect(marketEngine.validateMarketRequest("DE").valid).toBe(true);
    expect(marketEngine.validateMarketRequest("XX").valid).toBe(false);
  });

  it("B2B intra-EU reverse charge on server", () => {
    const ctx = marketEngine.getVatContext({
      sellerCountry: "DE",
      buyerCountry: "IT",
      customerType: "B2B",
      vatId: "IT12345678901",
    });
    expect(ctx.reverseCharge).toBe(true);
    expect(ctx.rate).toBe(0);
  });

  it("supplier regions for GCC", () => {
    const regions = marketEngine.getEligibleSupplierRegions("AE");
    expect(regions[0]).toBe("GCC");
    expect(regions).toContain("EU");
  });

  it("product availability delegates to country availability", () => {
    const result = marketEngine.isProductAvailableInMarket(
      { countryAvailability: { DE: true } },
      "DE"
    );
    expect(result.available).toBe(true);
  });
});
