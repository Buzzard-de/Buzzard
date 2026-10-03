import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createProductSot } = require("../lib/sot/productSot.js");
const { ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");

function productSot(env) {
  const events = [];
  return createProductSot({
    env,
    logAudit: (row) => events.push(row),
    existingProductSot: { isSotActive: () => env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" },
  });
}

describe("product SoT", () => {
  it("allows the product engine and blocks supplier, marketplace, and AI", () => {
    const sot = productSot({ BUZZARD_PRODUCT_SOT_ACTIVE: "0" });
    expect(sot.assertProductWriteAuthority({ actor: ACTORS.PRODUCT_ENGINE }).ok).toBe(true);
    expect(() => sot.createProduct({ actor: ACTORS.SUPPLIER })).toThrow(/cannot write/);
    expect(() => sot.createProduct({ actor: ACTORS.MARKETPLACE })).toThrow(/cannot write/);
    expect(() => sot.createProduct({ actor: ACTORS.AI })).toThrow(/cannot write/);
  });

  it("blocks writes while Product SoT is inactive", () => {
    const sot = productSot({ BUZZARD_PRODUCT_SOT_ACTIVE: "0" });
    expect(() => sot.createProduct({ actor: ACTORS.PRODUCT_ENGINE })).toThrow(/PRODUCT_SOT_INACTIVE/);
  });
});
