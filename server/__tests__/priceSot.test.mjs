import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createPriceSot } = require("../lib/sot/priceSot.js");
const { ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");

describe("price SoT", () => {
  it("allows the pricing engine and blocks marketplace overwrite", () => {
    const sot = createPriceSot({ logAudit: () => {} });
    const set = sot.setPrice({ actor: ACTORS.PRICING_ENGINE, productId: "sku-1", supplierCost: 10 });
    expect(set.source).toBe(ACTORS.PRICING_ENGINE);
    expect(set.persistedToListing).toBe(false);
    expect(() => sot.setPrice({ actor: ACTORS.MARKETPLACE, productId: "sku-1" })).toThrow(/cannot write/);
  });

  it("returns 409 on expectedVersion mismatch", () => {
    const sot = createPriceSot({ logAudit: () => {} });
    sot.setPrice({ actor: ACTORS.PRICING_ENGINE, productId: "sku-v" });
    try {
      sot.setPrice({ actor: ACTORS.PRICING_ENGINE, productId: "sku-v", expectedVersion: 18 });
      throw new Error("expected version conflict");
    } catch (error) {
      expect(error.code).toBe("SOT_VERSION_CONFLICT");
      expect(error.statusCode).toBe(409);
    }
  });
});
