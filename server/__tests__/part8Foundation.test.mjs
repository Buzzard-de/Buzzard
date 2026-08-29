import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

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
    const prev = process.env.BUZZARD_PAYMENT_ENABLED;
    process.env.BUZZARD_PAYMENT_ENABLED = "1";
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
    const ff = require("../lib/commerce/commerceFeatureFlags.js");
    expect(ff.getEffectiveFlags().paymentEnabled).toBe(false);
    expect(ff.detectFlagViolations(ff.getRawFlags()).length).toBeGreaterThan(0);
    process.env.BUZZARD_PAYMENT_ENABLED = prev;
    delete require.cache[require.resolve("../lib/commerce/commerceFeatureFlags.js")];
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

describe("cartService", () => {
  it("creates cart and resolves authoritative price", () => {
    const cartService = require("../lib/commerce/cartService.js");
    const productCore = require("../lib/pim/productCore.js");
    const demo = productCore.listProducts({ limit: 5 }).find((p) => p.sku === "BZ-CORE-DEMO-001");
    expect(demo).toBeTruthy();

    const cart = cartService.createCart({ sessionId: `vitest-${crypto.randomBytes(3).toString("hex")}` });
    expect(cart.cart?.id).toBeTruthy();

    const price = cartService.resolveAuthoritativePrice(demo.id);
    expect(price.priceSnapshot).toBeGreaterThan(0);

    const updated = cartService.addItem(cart.cart.id, { productId: demo.id, quantity: 1 });
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
    const productCore = require("../lib/pim/productCore.js");
    const demo = productCore.listProducts({ limit: 5 }).find((p) => p.sku === "BZ-CORE-DEMO-001");
    const cart = cartService.createCart({ sessionId: "state-test" });
    cartService.addItem(cart.cart.id, { productId: demo.id, quantity: 1 });

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
