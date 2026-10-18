import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const part8Dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/test-scratch");
fs.mkdirSync(part8Dir, { recursive: true });
const part8Db = path.join(part8Dir, "part8-foundation.db");
process.env.BUZZARD_DB_PATH = part8Db;

describe("commerceConstants", () => {
  it("controls checkout transitions", () => {
    const { canTransitionCheckout, CHECKOUT_STATE } = require("../core/commerceConstants.js");
    expect(canTransitionCheckout(CHECKOUT_STATE.DRAFT, CHECKOUT_STATE.VALIDATING)).toBe(true);
    expect(canTransitionCheckout(CHECKOUT_STATE.COMPLETED, CHECKOUT_STATE.DRAFT)).toBe(false);
  });

  it("controls order transitions", () => {
    const { canTransitionOrder, ORDER_STATUS } = require("../core/commerceConstants.js");
    expect(canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED)).toBe(true);
    expect(canTransitionOrder(ORDER_STATUS.DELIVERED, ORDER_STATUS.PENDING)).toBe(false);
  });
});

describe("commerceFeatureFlags", () => {
  it("blocks child flags when sales disabled", () => {
    const { getEffectiveFlags, detectFlagViolations } = require("../lib/commerce/commerceFeatureFlags.js");
    const flags = getEffectiveFlags();
    expect(flags.salesEnabled).toBe(false);
    expect(flags.paymentEnabled).toBe(false);
    expect(flags.supplierOrdersEnabled).toBe(false);
    expect(flags.livePaymentsEnabled).toBe(false);
    expect(flags.productSotActive).toBe(false);
    const prev = process.env.BUZZARD_PAYMENT_ENABLED;
    process.env.BUZZARD_PAYMENT_ENABLED = "1";
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
    const ff = require("../lib/commerce/commerceFeatureFlags.js");
    expect(ff.getEffectiveFlags().paymentEnabled).toBe(false);
    expect(ff.detectFlagViolations(ff.getRawFlags()).length).toBeGreaterThan(0);
    process.env.BUZZARD_PAYMENT_ENABLED = prev;
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
  });

  it("keeps live payments and Product SoT ineffective without parent sales and human SoT activation", () => {
    const prevLive = process.env.BUZZARD_LIVE_PAYMENTS;
    const prevSot = process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    process.env.BUZZARD_LIVE_PAYMENTS = "1";
    process.env.BUZZARD_PRODUCT_SOT_ACTIVE = "1";
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
    const ff = require("../lib/commerce/commerceFeatureFlags.js");
    const flags = ff.getEffectiveFlags();
    expect(flags.livePaymentsEnabled).toBe(false);
    expect(flags.productSotActive).toBe(false);
    expect(flags.productSotEnvFlag).toBe(true);
    const codes = ff.detectFlagViolations(ff.getRawFlags()).map((row) => row.flag);
    expect(codes).toContain("BUZZARD_LIVE_PAYMENTS");
    expect(codes).toContain("BUZZARD_PRODUCT_SOT_ACTIVE");
    if (prevLive === undefined) delete process.env.BUZZARD_LIVE_PAYMENTS;
    else process.env.BUZZARD_LIVE_PAYMENTS = prevLive;
    if (prevSot === undefined) delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    else process.env.BUZZARD_PRODUCT_SOT_ACTIVE = prevSot;
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
  });

  it("assertFeatureAllowed denies live payments and Product SoT while locks hold", () => {
    const { assertFeatureAllowed } = require("../lib/commerce/commerceFeatureFlags.js");
    expect(assertFeatureAllowed("live_payments").allowed).toBe(false);
    expect(assertFeatureAllowed("product_sot").allowed).toBe(false);
    expect(assertFeatureAllowed("sales").allowed).toBe(false);
  });
});

describe("commerceValidation", () => {
  it("rejects invalid quantity and client totals", () => {
    const v = require("../lib/commerce/commerceValidation.js");
    expect(v.validateQuantity(-1).ok).toBe(false);
    expect(v.validateQuantity(999).ok).toBe(false);
    expect(v.rejectClientTotals({ total: 1 }).ok).toBe(false);
    expect(v.detectPriceTampering(1, 100).tampered).toBe(true);
  });

  it("computes order totals server-side", () => {
    const v = require("../lib/commerce/commerceValidation.js");
    const totals = v.computeOrderTotals({
      items: [{ priceSnapshot: 10, quantity: 2 }],
      shipping: 5,
      taxRate: 19,
    });
    expect(totals.subtotal).toBe(20);
    expect(totals.total).toBeGreaterThan(20);
  });
});

function assertIsolatedDb() {
  const { resolveDbPath } = require("../lib/dbPaths.js");
  const resolved = resolveDbPath();
  expect(resolved).toBe(part8Db);
  expect(resolved).not.toMatch(/server[\\/]data[\\/]buzzard\.db$/);
}

function seedVisibleCatalogProduct() {
  assertIsolatedDb();
  const productCore = require("../lib/pim/productCore.js");
  const catalogCache = require("../lib/storefront/catalogCache.js");
  const suffix = crypto.randomBytes(3).toString("hex");
  const product = productCore.createProduct(
    {
      sku: `UNIT-CART-${suffix}`,
      title: "Isolated cart fixture",
      description: "Unit-test fixture for cart and checkout only.",
      category: "cat-05",
      price: 12.5,
      stock: 10,
      status: "READY",
      visibility: "PUBLIC",
    },
    { source: "SYSTEM", actorId: "vitest" }
  );
  catalogCache.invalidate();
  return product;
}

function seedHiddenCatalogProduct() {
  assertIsolatedDb();
  const productCore = require("../lib/pim/productCore.js");
  const suffix = crypto.randomBytes(3).toString("hex");
  return productCore.createProduct(
    {
      sku: `UNIT-HIDDEN-${suffix}`,
      title: "Isolated hidden fixture",
      description: "Not purchasable on the storefront.",
      category: "cat-05",
      price: 12.5,
      stock: 10,
      status: "READY",
      visibility: "HIDDEN",
    },
    { source: "SYSTEM", actorId: "vitest" }
  );
}

describe("cartService", () => {
  it("creates cart and resolves authoritative price", () => {
    const cartService = require("../lib/commerce/cartService.js");
    const hidden = seedHiddenCatalogProduct();
    expect(hidden?.id).toBeTruthy();
    const hiddenPrice = cartService.resolveAuthoritativePrice(hidden.id);
    expect(hiddenPrice.error).toBeTruthy();

    const visible = seedVisibleCatalogProduct();
    expect(visible?.id).toBeTruthy();
    expect(visible.status).toBe("READY");
    expect(visible.visibility).toBe("PUBLIC");

    const cart = cartService.createCart({ sessionId: `vitest-${crypto.randomBytes(3).toString("hex")}` });
    expect(cart.cart?.id).toBeTruthy();

    const price = cartService.resolveAuthoritativePrice(visible.id);
    expect(price.priceSnapshot).toBeGreaterThan(0);

    const updated = cartService.addItem(cart.cart.id, {
      productId: visible.id,
      quantity: 1,
      sessionId: cart.cart.sessionId,
    });
    if (updated.error === "insufficient_stock") {
      expect(updated.dryRun).toBe(true);
    } else {
      expect(updated.items?.length).toBeGreaterThan(0);
    }
  });
});

describe("checkoutService state machine", () => {
  it("blocks illegal transitions", () => {
    const checkoutService = require("../lib/commerce/checkoutService.js");
    const cartService = require("../lib/commerce/cartService.js");
    const visible = seedVisibleCatalogProduct();
    expect(visible?.id).toBeTruthy();
    const cart = cartService.createCart({ sessionId: `state-test-${Date.now()}` });
    cartService.addItem(cart.cart.id, {
      productId: visible.id,
      quantity: 1,
      sessionId: cart.cart.sessionId,
    });

    const chk = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN" });
    expect(chk.id).toBeTruthy();
    const bad = checkoutService.transitionCheckout(chk.id, "COMPLETED");
    expect(bad.error).toBe("illegal_state_transition");
  });
});

describe("orderService supplier boundary", () => {
  it("blocks supplier order submission", () => {
    const orderService = require("../lib/commerce/orderService.js");
    const result = orderService.submitSupplierOrder("ord_fake", {});
    expect(result.supplierOrderCreated).toBe(false);
    expect(result.status).toBe(403);
  });

  it("blocks commercial orders when sales disabled", () => {
    const orderService = require("../lib/commerce/orderService.js");
    const block = orderService.createOrderFromCheckout({
      checkout: { id: "chk_test", cartId: "c", customerId: null, orderType: "COMMERCIAL", totals: {} },
      payment: { status: "NONE" },
      orderType: "COMMERCIAL",
    });
    expect(block.blocked || block.code === "sales_disabled").toBe(true);
  });
});

describe("paymentService", () => {
  it("uses mock provider and rejects credentials", () => {
    const paymentService = require("../lib/commerce/paymentService.js");
    const intent = paymentService.createPaymentIntent({ amount: 10, dryRun: true });
    expect(intent.mockOnly).toBe(true);
    expect(intent.realMoneyMovement).toBe(false);
    expect(paymentService.sanitizePaymentPayload({ cardNumber: "4111" }).rejected).toBe(true);
  });
});

describe("idempotency", () => {
  it("stores and replays idempotency keys", () => {
    const idempotency = require("../lib/commerce/idempotency.js");
    const key = `test-${crypto.randomBytes(4).toString("hex")}`;
    idempotency.storeIdempotency({ key, scope: "unit", resourceId: "r1", response: { ok: true } });
    const hit = idempotency.getIdempotency({ key, scope: "unit" });
    expect(hit?.response?.ok).toBe(true);
    expect(hit.replay).toBe(true);
  });

  it("replays withIdempotency without invoking the handler twice", () => {
    const idempotency = require("../lib/commerce/idempotency.js");
    const key = `with-${crypto.randomBytes(4).toString("hex")}`;
    let calls = 0;
    const first = idempotency.withIdempotency({
      key,
      scope: "unit-with",
      handler: () => {
        calls += 1;
        return { ok: true, id: "once" };
      },
    });
    const second = idempotency.withIdempotency({
      key,
      scope: "unit-with",
      handler: () => {
        calls += 1;
        return { ok: false, id: "twice" };
      },
    });
    expect(first.id).toBe("once");
    expect(second.idempotencyReplay).toBe(true);
    expect(second.id).toBe("once");
    expect(calls).toBe(1);
  });

  it("replays cart addItem when Idempotency-Key is repeated", () => {
    const cartService = require("../lib/commerce/cartService.js");
    const visible = seedVisibleCatalogProduct();
    const cart = cartService.createCart({ sessionId: `vitest-${crypto.randomBytes(3).toString("hex")}` });
    const key = `cart-${crypto.randomBytes(4).toString("hex")}`;
    const first = cartService.addItem(cart.cart.id, {
      productId: visible.id,
      quantity: 1,
      sessionId: cart.cart.sessionId,
      idempotencyKey: key,
    });
    const second = cartService.addItem(cart.cart.id, {
      productId: visible.id,
      quantity: 1,
      sessionId: cart.cart.sessionId,
      idempotencyKey: key,
    });
    expect(second.idempotencyReplay).toBe(true);
    const firstQty = first.items?.find((row) => row.productId === visible.id)?.quantity;
    const secondQty = second.items?.find((row) => row.productId === visible.id)?.quantity;
    expect(secondQty).toBe(firstQty);
  });
});

describe("commerceReadiness", () => {
  it("runs readiness gate with sales blocked", () => {
    const commerceReadiness = require("../lib/commerce/commerceReadiness.js");
    const gate = commerceReadiness.runReadinessGate();
    expect(gate.checks.length).toBeGreaterThan(15);
    expect(gate.salesBlocked).toBe(true);
    expect(gate.salesActivationAllowed).toBe(false);
    const salesCheck = gate.checks.find((c) => c.name === "SALES_GATE");
    expect(salesCheck?.status).toBe("PASS");
  });
});

describe("goLiveApproval", () => {
  it("does not enable sales on approve", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    const req = goLiveApproval.requestGoLive({ requestedBy: "vitest@example.com" });
    const approved = goLiveApproval.approveGoLive({ requestId: req.id, decidedBy: "admin@test" });
    expect(approved.salesEnabled).toBe(false);
    expect(approved.productionSafetyLock).toBe(true);
    expect(goLiveApproval.canActivateSales().allowed).toBe(false);
  });
});

describe("legacyPimMigration", () => {
  it("runs dry-run only", () => {
    const legacyPimMigration = require("../lib/commerce/legacyPimMigration.js");
    const report = legacyPimMigration.runDryRunMigration();
    expect(report.dryRun).toBe(true);
    expect(report.destructive).toBe(false);
  });
});

describe("productSearchAbstraction", () => {
  it("uses sql backend by default", () => {
    const productSearch = require("../lib/commerce/productSearchAbstraction.js");
    expect(productSearch.getBackend()).toBe("sql");
    const health = productSearch.getSearchHealth();
    expect(health.fallbackAvailable).toBe(true);
  });
});

describe("commerceGuards IDOR", () => {
  it("denies cross-customer access", () => {
    const { assertCustomerResourceAccess } = require("../lib/commerce/commerceGuards.js");
    const block = assertCustomerResourceAccess({
      resourceCustomerId: "cust_a",
      requestCustomerId: "cust_b",
      resourceType: "order",
    });
    expect(block.blocked).toBe(true);
    expect(block.code).toBe("idor_denied");
  });

  it("fails closed on guest resources without proof", () => {
    const { assertCustomerResourceAccess } = require("../lib/commerce/commerceGuards.js");
    const block = assertCustomerResourceAccess({
      resourceCustomerId: null,
      requestCustomerId: null,
      resourceType: "checkout",
    });
    expect(block.blocked).toBe(true);
    expect(block.code).toBe("auth_required");
    expect(block.status).toBe(401);
  });

  it("allows guest resources only with a matching proof", () => {
    const { assertCustomerResourceAccess } = require("../lib/commerce/commerceGuards.js");
    const allowed = assertCustomerResourceAccess({
      resourceCustomerId: null,
      requestCustomerId: null,
      resourceType: "checkout",
      guestProofValid: true,
    });
    expect(allowed).toBeNull();
  });
});

describe("webhookFoundation", () => {
  it("blocks webhooks when sales disabled", () => {
    const webhookFoundation = require("../lib/commerce/webhookFoundation.js");
    const result = webhookFoundation.handleWebhook({
      provider: "stripe",
      eventId: `evt_${crypto.randomBytes(4).toString("hex")}`,
      eventType: "test",
      rawBody: "{}",
      signature: "x",
      secret: "secret",
    });
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
  });
});
