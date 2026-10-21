import { afterEach, describe, expect, it } from "vitest";

function uniqueSku(prefix = "P2") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

describe("master integration phase 2", () => {
  afterEach(() => {
    delete process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE;
    delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    delete process.env.BUZZARD_PRODUCT_SOT_MODE;
    delete process.env.BUZZARD_PRODUCT_SOT_IDENTITY_VALIDATED;
    delete process.env.BUZZARD_PRODUCT_IDENTITY_PRODUCTION_EXPORT;
    delete process.env.BUZZARD_SALES_ENABLED;
    delete process.env.PUSAT_RUNTIME_ENABLED;
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
  });

  it("lists A–G sources without claiming sync", async () => {
    const { sourceMatrix } = await import("../lib/productIdentitySources.js");
    const rows = sourceMatrix();
    expect(rows.map((r) => r.SOURCE).join("")).toBe("ABCDEFG");
    expect(rows.find((r) => r.SOURCE === "D").STATUS).toBe("CANONICAL_TARGET");
    expect(rows.find((r) => r.SOURCE === "A").WRITE).toContain("productStore");
  });

  it("defaults SoT mode to READ_TARGET and refuses EXCLUSIVE without identity validation", async () => {
    const productSot = await import("../lib/productSot.js");
    expect(productSot.getSotMode().mode).toBe("READ_TARGET");
    process.env.BUZZARD_PRODUCT_SOT_MODE = "EXCLUSIVE";
    const blocked = productSot.getSotMode();
    expect(blocked.mode).toBe("READ_TARGET");
    expect(blocked.blockedReason).toBe("BLOCKED_BY_PRODUCTION_ACCESS");
    expect(productSot.getStatus().productionIdentityExport).toBe("BLOCKED_BY_PRODUCTION_ACCESS");
  });

  it("maps exact SKU and queues low-confidence brand/model without merging", async () => {
    const detector = await import("../lib/productCollisionDetector.js");
    const exact = detector.proposeMapping({
      source: "A",
      sourceId: `prod-phase2-sku-${Date.now()}`,
      sku: "BZ-CORE-DEMO-001",
    });
    expect(exact.method).toBe("EXACT_SKU");
    expect(exact.merged).toBe(false);
    expect(exact.mapping.target_sku).toBe("BZ-CORE-DEMO-001");

    const fuzzy = detector.proposeMapping({
      source: "A",
      sourceId: `prod-phase2-brand-${Date.now()}`,
      sku: "NO-SUCH-SKU-PHASE2",
      brand: "Buzzard Demo",
      title: "Universal Demo Product",
    });
    expect(fuzzy.method).toBe("BRAND_MODEL");
    expect(fuzzy.collisionStatus).toBe("POSSIBLE");
    expect(fuzzy.merged).toBe(false);
    expect(fuzzy.mapping.target_product_id).toBeNull();
    expect(detector.listReviewQueue().length).toBeGreaterThan(0);
  });

  it("blocks exclusive activation when production identity export is missing", async () => {
    const { validateMigration } = await import("../lib/productSotValidator.js");
    const report = validateMigration();
    expect(report.result).toBe("BLOCK");
    expect(report.canActivateExclusive).toBe(false);
    expect(report.findings.some((f) => f.code === "BLOCKED_BY_PRODUCTION_ACCESS")).toBe(true);
  });

  it("serves canonical product APIs from D and rejects invalid price", async () => {
    const productService = await import("../lib/productService.js");
    const sku = uniqueSku("SVC");
    const created = productService.createProduct({
      sku,
      title: "Phase 2 service product",
      price: 12.5,
      stock: 8,
      visibility: "HIDDEN",
      status: "DRAFT",
    });
    expect(productService.getProduct(created.id).sku).toBe(sku);
    expect(productService.getProductBySku(sku).id).toBe(created.id);
  });

  it("computes saleable stock and blocks negative/over-reserve without mutating D stock", async () => {
    const productService = await import("../lib/productService.js");
    const inventory = await import("../lib/commerce/inventoryIntegration.js");
    const sku = uniqueSku("INV");
    const product = productService.createProduct({ sku, title: "Inv product", price: 10, stock: 2 });
    const before = product.stock;
    const ok = inventory.reserve({ productId: product.id, quantity: 2, idempotencyKey: `k-${sku}` });
    expect(ok.ok).toBe(true);
    expect(ok.mode).toBe("DRY_RUN");
    const again = inventory.reserve({ productId: product.id, quantity: 2, idempotencyKey: `k-${sku}` });
    expect(again.duplicate).toBe(true);
    const overflow = inventory.reserve({ productId: product.id, quantity: 1 });
    expect(overflow.ok).toBe(false);
    expect(productService.getProduct(product.id).stock).toBe(before);
  });

  it("quotes price deterministically and denies AI price writes", async () => {
    const productService = await import("../lib/productService.js");
    const pricing = await import("../lib/commerce/pricingIntegration.js");
    const sku = uniqueSku("PRC");
    const product = productService.createProduct({ sku, title: "Price product", price: 20, stock: 5 });
    const a = pricing.quotePrice({ productId: product.id, supplierCost: 10, shippingCost: 2, targetMargin: 0.38 });
    const b = pricing.quotePrice({ productId: product.id, supplierCost: 10, shippingCost: 2, targetMargin: 0.38 });
    expect(a.recommendedPrice).toBe(b.recommendedPrice);
    expect(a.recommendationOnly).toBe(true);
    expect(a.mode).toBe("DRY_RUN");
    const denied = pricing.applyPriceChange({ productId: product.id, amount: 99, actorType: "AI", approved: true, permission: true });
    expect(denied.code).toBe("AI_PRICE_WRITE_DENIED");
    expect(productService.getProduct(product.id).price).toBe(20);
  });

  it("builds cart/checkout/order snapshots from D and keeps sales locked", async () => {
    const productService = await import("../lib/productService.js");
    const chain = await import("../lib/commerce/coreEngineChain.js");
    const { isSalesEnabled } = await import("../lib/salesMode.js");
    const sku = uniqueSku("ORD");
    const product = productService.createProduct({ sku, title: "Order product", price: 15, stock: 4 });
    const line = chain.buildLineSnapshot(product.id, 1);
    expect(line.ok).toBe(true);
    expect(line.item.productId).toBe(product.id);
    expect(line.item.sku).toBe(sku);
    expect(line.item.snapshotVersion).toContain(product.id);
    const checkout = chain.validateCheckoutCanonical({ productId: product.id, quantity: 1 });
    expect(checkout.ok).toBe(true);
    expect(checkout.payment.capture).toBe(false);
    const order = chain.prepareOrder({ productId: product.id, quantity: 1, correlationId: `c-${sku}` });
    expect(order.ok).toBe(true);
    expect(order.mode).toBe("DRY_RUN");
    expect(order.commercialFulfillment).toBe(false);
    expect(order.snapshots.product.sku).toBe(sku);
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    expect(isSalesEnabled()).toBe(false);
  });

  it("emits chain events with aggregate metadata", async () => {
    const events = await import("../lib/eventBus.js");
    const key = `evt_p2_${Date.now()}`;
    const first = events.emit({
      type: events.TYPES.OrderPrepared,
      idempotencyKey: key,
      aggregateId: "ordprep_x",
      aggregateType: "order",
      payload: { id: "ordprep_x" },
    });
    const second = events.emit({
      type: events.TYPES.OrderPrepared,
      idempotencyKey: key,
      aggregateId: "ordprep_x",
      aggregateType: "order",
      payload: { id: "ordprep_x" },
    });
    expect(first.duplicate).toBe(false);
    expect(first.aggregateType).toBe("order");
    expect(second.duplicate).toBe(true);
  });

  it("keeps Pusat read-only for inventory/price and denies money/stock writes", async () => {
    const productService = await import("../lib/productService.js");
    const pusat = await import("../lib/pusat/runtime.js");
    const sku = uniqueSku("PUS");
    const product = productService.createProduct({ sku, title: "Pusat read product", price: 9, stock: 3 });
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const inv = pusat.executeReadOnly("GET_INVENTORY", { id: product.id });
    expect(inv.ok).toBe(true);
    expect(inv.mode).toBe("DRY_RUN");
    const price = pusat.executeReadOnly("GET_PRICE", { id: product.id });
    expect(price.ok).toBe(true);
    expect(price.data.recommendationOnly).toBe(true);
    expect(pusat.executeReadOnly("SET_PRICE", { id: product.id }).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("SET_STOCK", { id: product.id }).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("CREATE_SUPPLIER_ORDER", {}).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("ISSUE_REFUND", {}).code).toBe("PERMISSION_DENIED");
    expect(productService.getProduct(product.id).price).toBe(9);
    expect(productService.getProduct(product.id).stock).toBe(3);
  });

  it("locks legacy writers in EXCLUSIVE test override and keeps sales off", async () => {
    process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE = "1";
    delete process.env.BUZZARD_SALES_ENABLED;
    const productSot = await import("../lib/productSot.js");
    const { evaluateSalesGate } = await import("../lib/salesSafetyGate.js");
    expect(() => productSot.assertCanonicalWrite("A")).toThrowError(/Legacy product write locked/);
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    expect(evaluateSalesGate().status).toBe("LOCKED");
  });
});
