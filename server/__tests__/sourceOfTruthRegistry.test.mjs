import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");

describe("source of truth registry", () => {
  it("assigns the four owners and blocks supplier/marketplace/AI/Pusat writes", () => {
    const registry = createSourceOfTruthRegistry({ env: { BUZZARD_PRODUCT_SOT_ACTIVE: "0", BUZZARD_SALES_ENABLED: "0" } });
    expect(registry.getWriteOwner(ENTITIES.PRODUCT)).toBe(ACTORS.PRODUCT_ENGINE);
    expect(registry.getWriteOwner(ENTITIES.ORDER)).toBe(ACTORS.ORDER_ENGINE);
    expect(registry.getWriteOwner(ENTITIES.AVAILABILITY)).toBe(ACTORS.AVAILABILITY_ENGINE);
    expect(registry.getWriteOwner(ENTITIES.PRICE)).toBe(ACTORS.PRICING_ENGINE);
    expect(registry.assertWriteAuthority({ entity: ENTITIES.PRODUCT, actor: ACTORS.PRODUCT_ENGINE }).ok).toBe(true);
    expect(registry.assertWriteAuthority({ entity: ENTITIES.ORDER, actor: ACTORS.ORDER_ENGINE }).ok).toBe(true);
    for (const actor of [ACTORS.SUPPLIER, ACTORS.MARKETPLACE, ACTORS.AI, ACTORS.PUSAT]) {
      expect(() => registry.assertWriteAuthority({ entity: ENTITIES.PRODUCT, actor })).toThrowError(/SOT_WRITE_AUTHORITY_VIOLATION|cannot write/);
    }
    expect(registry.getSoTStatus(ENTITIES.PRODUCT).status).toBe("LOCKED");
    expect(registry.salesLocked).toBe(true);
    expect(registry.isSourceInput(ENTITIES.PRODUCT, "supplier_catalog")).toBe(true);
    expect(registry.isProjection(ENTITIES.PRICE, "marketplace_listing")).toBe(true);
  });
});
