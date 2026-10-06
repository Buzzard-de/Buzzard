import { describe, it } from "node:test";
import assert from "node:assert/strict";
import marketEngine from "../core/marketEngineRegistry.js";

const TEST_MARKETS = ["DE", "FR", "IT", "ES", "PL", "NL", "TR", "SA", "AE", "EG"];

describe("Server Market Engine Registry", () => {
  it("loads 35 markets", () => {
    const validation = marketEngine.validateMarketRegistry();
    assert.equal(validation.valid, true);
    assert.equal(validation.count, 35);
    assert.equal(marketEngine.getMarketRegistryCount(), 35);
  });

  for (const code of TEST_MARKETS) {
    it(`resolves ${code}`, () => {
      const market = marketEngine.getMarket(code);
      assert.ok(market);
      assert.equal(market.countryCode, code);
    });
  }

  it("validates market requests server-side", () => {
    const valid = marketEngine.validateMarketRequest("DE");
    assert.equal(valid.valid, true);
    const invalid = marketEngine.validateMarketRequest("XX");
    assert.equal(invalid.valid, false);
  });

  it("B2B intra-EU reverse charge on server", () => {
    const ctx = marketEngine.getVatContext({
      sellerCountry: "DE",
      buyerCountry: "IT",
      customerType: "B2B",
      vatId: "IT12345678901",
    });
    assert.equal(ctx.reverseCharge, true);
    assert.equal(ctx.rate, 0);
  });

  it("supplier regions for GCC", () => {
    const regions = marketEngine.getEligibleSupplierRegions("AE");
    assert.equal(regions[0], "GCC");
    assert.ok(regions.includes("EU"));
  });

  it("product availability delegates to country availability", () => {
    const result = marketEngine.isProductAvailableInMarket(
      { countryAvailability: { DE: true } },
      "DE"
    );
    assert.equal(result.available, true);
  });
});
