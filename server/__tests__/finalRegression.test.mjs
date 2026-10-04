import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  createFinalRegressionManifest,
  assertLockedSafety,
  GROUPS,
  INVARIANTS,
} = require("../lib/finalRegressionManifest.js");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");
const { createSotConflictDetector } = require("../lib/sot/sotConflictDetector.js");
const { createGoLiveGate } = require("../lib/goLiveGate.js");
const { createPriceSot } = require("../lib/sot/priceSot.js");
const { EXACT, PUBLIC_ROUTES } = require("../lib/routePermissions.js");
const { BaseSupplierAdapter } = require("../lib/supplier/baseAdapter.js");

const env = {
  BUZZARD_PRODUCT_SOT_ACTIVE: "0",
  BUZZARD_SALES_ENABLED: "0",
  BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
  BUZZARD_PAYMENT_LIVE: "0",
};

describe("final regression invariants", () => {
  it("keeps safety locked and SoT owners exclusive", () => {
    const safety = assertLockedSafety(env);
    expect(safety.PRODUCT_SOT_ACTIVE).toBe("OFF");
    expect(safety.SALES_LOCKED).toBe("YES");
    expect(safety.SUPPLIER_ORDER_EXECUTION).toBe("OFF");
    expect(safety.PAYMENT_EXECUTION).toBe("OFF");
    expect(safety.MARKETPLACE_WRITE).toBe("OFF");
    expect(safety.PRODUCTION_WRITES).toBe("NOT_EXECUTED");
    expect(GROUPS.length).toBeGreaterThanOrEqual(36);
    expect(INVARIANTS).toHaveLength(18);

    const sot = createSourceOfTruthRegistry({ env });
    expect(sot.getWriteOwner(ENTITIES.PRODUCT)).toBe(ACTORS.PRODUCT_ENGINE);
    expect(sot.getWriteOwner(ENTITIES.ORDER)).toBe(ACTORS.ORDER_ENGINE);
    expect(sot.getWriteOwner(ENTITIES.AVAILABILITY)).toBe(ACTORS.AVAILABILITY_ENGINE);
    expect(sot.getWriteOwner(ENTITIES.PRICE)).toBe(ACTORS.PRICING_ENGINE);
    expect(new Set(Object.values(ENTITIES).map((entity) => sot.getWriteOwner(entity))).size).toBe(4);

    for (const actor of [ACTORS.PUSAT, ACTORS.AI, ACTORS.SUPPLIER, ACTORS.MARKETPLACE]) {
      expect(() => sot.assertWriteAuthority({ entity: ENTITIES.PRODUCT, actor })).toThrow(/cannot write/);
      expect(() => sot.assertWriteAuthority({ entity: ENTITIES.PRICE, actor })).toThrow(/cannot write/);
    }

    const conflicts = createSotConflictDetector();
    expect(
      conflicts.detectConflict({
        entity: ENTITIES.AVAILABILITY,
        sotVersion: 10,
        incomingVersion: 8,
        source: "supplier_stock",
      }).type
    ).toBe("STALE_WRITE");

    const price = createPriceSot({
      registry: sot,
      env,
      logAudit: () => {},
      pricing: { quotePrice: () => ({ amount: 94, currency: "EUR" }) },
    });
    const canonical = price.getPrice({ sku: "SKU-1" });
    expect(canonical.amount).toBe(94);
    expect(canonical.source).toBe(ACTORS.PRICING_ENGINE);
    expect(() => price.setPrice({ actor: ACTORS.MARKETPLACE, productId: "SKU-1", amount: 99 })).toThrow(/cannot write/);

    expect(new BaseSupplierAdapter({ id: "x", name: "x" }).ordersEnabled).toBe(false);
    const goLive = createGoLiveGate({ env, productionSafetyLock: true }).evaluateGoLive();
    expect(goLive.status).toBe("BLOCKED");
    expect(goLive.decision).toBe("NO_GO");
    expect(PUBLIC_ROUTES.has("GET /api/health/go-live")).toBe(true);
    expect(EXACT["GET /api/admin/system/go-live"]).toBe("system.read");
    expect(createFinalRegressionManifest({ env }).expectedGoLive).toBe("BLOCKED");
    expect(JSON.stringify(safety)).not.toMatch(/password|Bearer |api[_-]?key/i);
  });
});
