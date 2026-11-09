import { afterEach, describe, expect, it } from "vitest";

function uniqueSku(prefix = "P3") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function sellableProduct(productService, extras = {}) {
  return productService.createProduct({
    sku: uniqueSku("P3S"),
    title: "Phase 3 sellable product",
    description: "Canonical commerce path test product.",
    price: extras.price ?? 21.5,
    stock: extras.stock ?? 10,
    visibility: "PUBLIC",
    status: "READY",
  });
}

const address = {
  line1: "Teststrasse 1",
  city: "Berlin",
  postalCode: "10115",
  country: "DE",
};

describe("master integration phase 3", () => {
  afterEach(() => {
    delete process.env.BUZZARD_SALES_ENABLED;
    delete process.env.BUZZARD_PAYMENT_LIVE;
    delete process.env.BUZZARD_FULFILLMENT_LIVE;
    delete process.env.BUZZARD_REFUND_LIVE;
    delete process.env.PUSAT_RUNTIME_ENABLED;
    delete process.env.BUZZARD_PRODUCT_SOT_MODE;
    delete process.env.BUZZARD_PRODUCT_SOT_IDENTITY_VALIDATED;
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
  });

  it("adds cart lines from Product D and rejects client price/VAT", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const product = sellableProduct(productService);
    const cart = cartService.createCart({ sessionId: `p3-${product.sku}` });
    const added = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    expect(added.error).toBeUndefined();
    expect(added.items[0].productId).toBe(product.id);
    expect(added.items[0].sku).toBe(product.sku);
    expect(added.items[0].productSnapshot.id).toBe(product.id);
    expect(added.items[0].snapshotVersion).toContain(product.id);
    expect(added.items[0].unitPrice).toBe(21.5);

    const priceReject = cartService.addItem(cart.cart.id, {
      productId: product.id,
      quantity: 1,
      clientPrice: 1,
    });
    expect(priceReject.error).toBe("price_tampering");

    const vatReject = cartService.addItem(cart.cart.id, {
      productId: product.id,
      quantity: 1,
      clientVat: 0,
    });
    expect(vatReject.code).toBe("PRICE_INVALID");
  });

  it("fails closed for missing product and identity conflict", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const checkoutService = await import("../lib/commerce/checkoutService.js");
    const productSot = await import("../lib/productSot.js");
    const missing = cartService.resolveAuthoritativePrice("no-such-product");
    expect(missing.code).toBe("PRODUCT_NOT_FOUND");

    const product = sellableProduct(productService);
    const cart = cartService.createCart({ sessionId: `p3-id-${product.sku}` });
    expect(cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 }).items.length).toBe(1);
    productSot.upsertIdentityMap({
      sourceSystem: "A",
      sourceId: `conflict-${product.id}`,
      targetProductId: product.id,
      mappingStatus: "REVIEW",
      collisionStatus: "CONFIRMED",
      confidence: 0.2,
    });
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    const validated = checkoutService.validateCheckout(chk.id, {
      billingAddress: address,
      shippingAddress: address,
    });
    expect(validated.code).toBe("PRODUCT_IDENTITY_CONFLICT");
  });

  it("fails insufficient inventory and reservation overflow", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const inventory = await import("../lib/commerce/inventoryIntegration.js");
    const product = sellableProduct(productService, { stock: 1 });
    const cart = cartService.createCart({ sessionId: `p3-st-${product.sku}` });
    const overflow = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 3 });
    expect(overflow.code).toBe("INVENTORY_INSUFFICIENT");
    const reserved = inventory.reserve({ productId: product.id, quantity: 1, idempotencyKey: `p3-${product.sku}` });
    expect(reserved.ok).toBe(true);
    const conflict = inventory.reserve({ productId: product.id, quantity: 1 });
    expect(conflict.code).toBe("INSUFFICIENT_STOCK");
  });

  it("runs existing checkout into order snapshots and keeps them immutable", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const checkoutService = await import("../lib/commerce/checkoutService.js");
    const orderService = await import("../lib/commerce/orderService.js");
    const product = sellableProduct(productService);
    const cart = cartService.createCart({ sessionId: `p3-ck-${product.sku}` });
    cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    const validated = checkoutService.validateCheckout(chk.id, {
      billingAddress: address,
      shippingAddress: address,
      shippingMethod: "standard",
    });
    expect(validated.state).toBe("READY");
    expect(validated.salesEnabled).toBe(false);

    const first = checkoutService.completeCheckout(chk.id, { idempotencyKey: `idem-${product.sku}` });
    expect(first.order?.id).toBeTruthy();
    expect(first.payment.captured).toBe(false);
    expect(first.payment.mode).toBe("DRY_RUN");
    expect(first.order.items[0].productSnapshot.sku).toBe(product.sku);
    expect(first.order.items[0].taxSnapshot.vatRate).toBeTruthy();
    expect(first.order.status).not.toBe("PAID");

    productService.updateProduct(product.id, { price: 99.99 });
    const stored = orderService.getOrder(first.order.id);
    expect(stored.items[0].priceSnapshot).toBe(21.5);
    expect(stored.items[0].productSnapshot.title).toBe("Phase 3 sellable product");

    const replay = checkoutService.completeCheckout(chk.id, { idempotencyKey: `idem-${product.sku}` });
    expect(replay.idempotencyReplay).toBe(true);
    expect(replay.order.id).toBe(first.order.id);

    const conflict = checkoutService.completeCheckout(chk.id, {
      idempotencyKey: `idem-${product.sku}`,
      capture: true,
    });
    expect(conflict.code).toBe("ORDER_IDEMPOTENCY_CONFLICT");
  });

  it("blocks DRY_RUN payment/fulfillment success states and keeps sales locked", async () => {
    const productService = await import("../lib/productService.js");
    const paymentService = await import("../lib/commerce/paymentService.js");
    const orderService = await import("../lib/commerce/orderService.js");
    const { evaluateSalesGate } = await import("../lib/salesSafetyGate.js");
    const { isSalesEnabled } = await import("../lib/salesMode.js");
    const productSot = await import("../lib/productSot.js");

    const capture = paymentService.capturePayment();
    expect(capture.code).toBe("PAYMENT_NOT_LIVE");
    expect(capture.captured).toBe(false);

    const product = sellableProduct(productService);
    const cartService = await import("../lib/commerce/cartService.js");
    const checkoutService = await import("../lib/commerce/checkoutService.js");
    const cart = cartService.createCart({ sessionId: `p3-stt-${product.sku}` });
    cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    checkoutService.validateCheckout(chk.id, {
      billingAddress: address,
      shippingAddress: address,
    });
    const done = checkoutService.completeCheckout(chk.id, { idempotencyKey: `st-${product.sku}` });
    const paid = orderService.transitionOrderStatus(done.order.id, "PAID");
    expect(["PAYMENT_NOT_LIVE", "illegal_order_transition"]).toContain(paid.code || paid.error);
    const shipped = orderService.transitionOrderStatus(done.order.id, "SHIPPED");
    expect(["FULFILLMENT_NOT_LIVE", "illegal_order_transition"]).toContain(shipped.code || shipped.error);

    process.env.BUZZARD_SALES_ENABLED = "1";
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    expect(evaluateSalesGate().status).toBe("LOCKED");
    expect(isSalesEnabled()).toBe(false);
    process.env.BUZZARD_PRODUCT_SOT_MODE = "EXCLUSIVE";
    expect(productSot.getSotMode().mode).toBe("READ_TARGET");
  });

  it("keeps Pusat commercial writes denied", async () => {
    const pusat = await import("../lib/pusat/runtime.js");
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    expect(pusat.executeReadOnly("SET_PRICE", {}).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("SET_STOCK", {}).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("CREATE_SUPPLIER_ORDER", {}).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("ISSUE_REFUND", {}).code).toBe("PERMISSION_DENIED");
    expect(pusat.executeReadOnly("CREATE_SHIPMENT", {}).code).toBe("PERMISSION_DENIED");
    const ex = pusat.executeReadOnly("GET_EXCEPTIONS", {});
    expect(ex.ok).toBe(true);
  });

  it("reports BLOCKED_BY_PRODUCTION_ACCESS from product:sot:validate input", async () => {
    const { validateIdentityExport } = await import("../lib/productSotValidator.js");
    const report = validateIdentityExport(null);
    expect(report.result).toBe("BLOCK");
    expect(report.findings.some((f) => f.code === "BLOCKED_BY_PRODUCTION_ACCESS")).toBe(true);
    expect(report.canActivateExclusive).toBe(false);
  });
});
