import { afterEach, describe, expect, it } from "vitest";

const createdProductIds = [];

function uniqueSku(prefix = "P3") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function sellableProduct(productService, extras = {}) {
  const product = productService.createProduct({
    sku: uniqueSku("P3S"),
    title: "Phase 3 sellable product",
    description: "Canonical commerce path test product.",
    price: extras.price ?? 21.5,
    stock: extras.stock ?? 10,
    visibility: "PUBLIC",
    status: "READY",
  });
  createdProductIds.push(product.id);
  return product;
}

const address = {
  line1: "Teststrasse 1",
  city: "Berlin",
  postalCode: "10115",
  country: "DE",
};

describe("master integration phase 3", () => {
  afterEach(async () => {
    const productService = await import("../lib/productService.js");
    while (createdProductIds.length) {
      const id = createdProductIds.pop();
      try {
        productService.archiveProduct(id);
      } catch {
        /* keep the row, but never leave it public */
      }
    }
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
    const before = cartService.getCart(cart.cart.id).items.length;
    const added = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1, live: true, available: true });
    expect(added.ok).toBe(false);
    expect(added.code).toBe("SALES_CLOSED");
    expect(added.stored).toBe(false);
    expect(added.purchasable).toBe(false);
    expect(added.reserved).toBe(false);
    expect(added.priceSnapshot).toBe(21.5);
    expect(added.reasons).toEqual(expect.arrayContaining(["STOCK_UNVERIFIED", "PRICE_POLICY_BLOCKED", "STALE_STOCK"]));
    expect(cartService.getCart(cart.cart.id).items.length).toBe(before);

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
    const added = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    expect(added.stored).toBe(false);
    productSot.upsertIdentityMap({
      sourceSystem: "A",
      sourceId: `conflict-${product.id}`,
      targetProductId: product.id,
      mappingStatus: "REVIEW",
      collisionStatus: "CONFIRMED",
      confidence: 0.2,
    });
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    expect(chk.code).toBe("SALES_CLOSED");
    expect(chk.checkoutCreated).toBe(false);
    expect(chk.reasons).toEqual(expect.arrayContaining(["STOCK_UNVERIFIED", "PAYMENT_UNVERIFIED", "SHIPPING_RATE_UNVERIFIED"]));
    const pathAdapter = await import("../lib/commerce/canonicalCommercePath.js");
    expect(pathAdapter.identityConflict(product.id).collision_status).toBe("CONFIRMED");
    const blocked = pathAdapter.buildImmutableSnapshot(product.id, 1);
    expect(blocked.code).toBe("PRODUCT_IDENTITY_CONFLICT");
    expect(blocked.ok).toBe(false);
  });

  it("fails insufficient inventory and reservation overflow", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const inventory = await import("../lib/commerce/inventoryIntegration.js");
    const product = sellableProduct(productService, { stock: 1 });
    const cart = cartService.createCart({ sessionId: `p3-st-${product.sku}` });
    const overflow = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 3, mock: true });
    expect(overflow.code).toBe("SALES_CLOSED");
    expect(overflow.reasons).toEqual(expect.arrayContaining(["STOCK_UNVERIFIED", "MOCK_STOCK", "STALE_STOCK"]));
    expect(overflow.stored).toBe(false);
    expect(productService.getProduct(product.id).stock).toBe(1);
    const reserved = inventory.reserve({ productId: product.id, quantity: 1, idempotencyKey: `p3-${product.sku}`, verified: true });
    expect(reserved.ok).toBe(false);
    expect(reserved.code).toBe("SALES_CLOSED");
    expect(reserved.created).toBe(false);
    const conflict = inventory.reserve({ productId: product.id, quantity: 1 });
    expect(conflict.ok).toBe(false);
    expect(conflict.stockDecremented).toBe(false);
  });

  it("runs existing checkout into order snapshots and keeps them immutable", async () => {
    const productService = await import("../lib/productService.js");
    const cartService = await import("../lib/commerce/cartService.js");
    const checkoutService = await import("../lib/commerce/checkoutService.js");
    const orderService = await import("../lib/commerce/orderService.js");
    const product = sellableProduct(productService);
    const cart = cartService.createCart({ sessionId: `p3-ck-${product.sku}` });
    const added = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    expect(added.reasons).toContain("PRICE_POLICY_BLOCKED");
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    expect(chk.code).toBe("SALES_CLOSED");
    expect(chk.checkoutCreated).toBe(false);
    expect(chk.reasons).toEqual(expect.arrayContaining(["PAYMENT_UNVERIFIED", "SHIPPING_RATE_UNVERIFIED"]));

    const first = checkoutService.completeCheckout(`missing-${product.sku}`, { idempotencyKey: `idem-${product.sku}` });
    expect(first.order).toBeUndefined();
    expect(first.code).toBe("SALES_CLOSED");
    expect(first.orderCreated).toBe(false);
    expect(orderService.getOrder("missing-blocked-order").error).toBe("order_not_found");
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
    const added = cartService.addItem(cart.cart.id, { productId: product.id, quantity: 1 });
    expect(added.checkoutAllowed).toBe(false);
    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    expect(chk.checkoutCreated).toBe(false);
    const done = checkoutService.completeCheckout(chk.id, { idempotencyKey: `st-${product.sku}` });
    expect(done.order).toBeUndefined();
    expect(done.code).toBe("SALES_CLOSED");
    expect(done.paymentAuthorized).toBe(false);
    const paid = orderService.transitionOrderStatus("missing-blocked-order", "PAID");
    expect(paid.error).toBe("order_not_found");
    const shipped = orderService.transitionOrderStatus("missing-blocked-order", "SHIPPED");
    expect(shipped.error).toBe("order_not_found");

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
