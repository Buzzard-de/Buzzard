import { afterEach, describe, expect, it } from "vitest";

describe("master integration foundation", () => {
  afterEach(() => {
    delete process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE;
    delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    delete process.env.BUZZARD_SALES_ENABLED;
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    delete process.env.PUSAT_RUNTIME_ENABLED;
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
  });

  it("selects D as target SoT without activating exclusive write", async () => {
    const productSot = await import("../lib/productSot.js");
    const status = productSot.getStatus();
    expect(status.target).toBe("D");
    expect(status.active).toBe(false);
    expect(status.exclusiveWrite).toBe(false);
    expect(productSot.assertCanonicalWrite("A").ok).toBe(true);
  });

  it("locks legacy writers when exclusive flag is on", async () => {
    process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE = "1";
    const productSot = await import("../lib/productSot.js");
    expect(() => productSot.assertCanonicalWrite("A")).toThrowError(/Legacy product write locked/);
    expect(productSot.assertCanonicalWrite("D").ok).toBe(true);
  });

  it("maps identity rows onto D without migrating other stores", async () => {
    const productSot = await import("../lib/productSot.js");
    const row = productSot.upsertIdentityMap({
      sourceSystem: "A",
      sourceId: "prod-audit-1",
      sourceSku: "SKU-AUDIT-1",
      mappingStatus: "UNMAPPED",
      collisionStatus: "UNVERIFIED",
      evidence: "unit",
    });
    expect(row.target_system).toBe("D");
    expect(row.target_product_id).toBeNull();
    expect(productSot.findBySource("A", "prod-audit-1").source_sku).toBe("SKU-AUDIT-1");
  });

  it("keeps the sales gate locked when P0 flags are missing", async () => {
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    process.env.BUZZARD_SALES_ENABLED = "1";
    const { evaluateSalesGate } = await import("../lib/salesSafetyGate.js");
    const { isSalesEnabled } = await import("../lib/salesMode.js");
    const gate = evaluateSalesGate();
    expect(gate.status).toBe("LOCKED");
    expect(gate.failed).toContain("PRODUCT_SOT_ACTIVE");
    expect(gate.failed).toContain("PAYMENT_LIVE");
    expect(isSalesEnabled()).toBe(false);
  });

  it("labels payment health as MOCK, not LIVE", async () => {
    const paymentService = await import("../lib/commerce/paymentService.js");
    const health = paymentService.getProviderHealth();
    expect(health.mode).toBe("MOCK");
    expect(health.live).toBe(false);
    expect(health.realMoneyMovement).toBe(false);
  });

  it("emits exceptions and idempotent events", async () => {
    const exceptions = await import("../lib/exceptionBus.js");
    const events = await import("../lib/eventBus.js");
    const ex = exceptions.emit({
      type: exceptions.TYPES.DATA_INCONSISTENCY,
      message: "identity inventory blocked",
      source: "test",
    });
    expect(ex.status).toBe("OPEN");
    const key = `evt_test_dup_${Date.now()}_${Math.random()}`;
    const first = events.emit({ type: "ProductUpdated", idempotencyKey: key, payload: { sku: "X" } });
    const second = events.emit({ type: "ProductUpdated", idempotencyKey: key, payload: { sku: "X" } });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it("keeps Pusat disabled and refuses writes; GET_PRODUCT reads D only when enabled", async () => {
    const pusat = await import("../lib/pusat/runtime.js");
    expect(pusat.isEnabled()).toBe(false);
    expect(pusat.executeReadOnly("GET_PRODUCT", { sku: "BZ-CORE-DEMO-001" }).code).toBe("PUSAT_DISABLED");
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const ping = pusat.executeReadOnly("PING", {});
    expect(ping.ok).toBe(true);
    expect(ping.mode).toBe("DRY_RUN");
    const product = pusat.executeReadOnly("GET_PRODUCT", { sku: "BZ-CORE-DEMO-001" });
    expect(product.ok).toBe(true);
    expect(product.source).toBe("D");
    expect(product.mode).toBe("DRY_RUN");
    const denied = pusat.executeReadOnly("CREATE_ORDER", {});
    expect(denied.code).toBe("PERMISSION_DENIED");
  });
});
