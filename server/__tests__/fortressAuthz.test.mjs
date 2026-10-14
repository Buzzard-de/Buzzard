import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { wrapRouteHandler } = require("../lib/globalAuthMiddleware");
const { toPublicDatabaseHealth } = require("../lib/db");
const { resolveRoutePermission } = require("../lib/routePermissions");
const paymentsFinance = require("../lib/paymentsFinance");

function mockReq(overrides = {}) {
  return {
    method: "POST",
    url: "/api/payments-finance/intents/1/confirm",
    headers: {},
    params: { id: "1" },
    body: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("Phase 13 fortress authorization", () => {
  it("rejects unauthenticated payment confirm and refund mutation", () => {
    let confirmCalled = false;
    const confirm = wrapRouteHandler("POST", "/api/payments-finance/intents/:id/confirm", () => {
      confirmCalled = true;
    });
    const refund = wrapRouteHandler("POST", "/api/payments-finance/intents/:id/refunds", () => {
      confirmCalled = true;
    });
    const invoice = wrapRouteHandler("POST", "/api/payments-finance/invoices", () => {
      confirmCalled = true;
    });

    const confirmRes = mockRes();
    confirm(mockReq(), confirmRes);
    expect(confirmCalled).toBe(false);
    expect(confirmRes.statusCode).toBe(401);

    const refundRes = mockRes();
    refund(mockReq({ url: "/api/payments-finance/intents/1/refunds" }), refundRes);
    expect(refundRes.statusCode).toBe(401);

    const invoiceRes = mockRes();
    invoice(mockReq({ url: "/api/payments-finance/invoices" }), invoiceRes);
    expect(invoiceRes.statusCode).toBe(401);
  });

  it("rejects unauthenticated privileged engine record writes", () => {
    const guarded = wrapRouteHandler("POST", "/api/payments-v36/records", () => {
      throw new Error("handler must not run");
    });
    const res = mockRes();
    guarded(mockReq({ url: "/api/payments-v36/records" }), res);
    expect(res.statusCode).toBe(401);
  });

  it("keeps public payment methods reachable without auth", () => {
    let called = false;
    const handler = wrapRouteHandler("GET", "/api/payments-finance/methods", () => {
      called = true;
    });
    const res = mockRes();
    handler(mockReq({ method: "GET", url: "/api/payments-finance/methods" }), res);
    expect(called).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("does not publish filesystem paths or table counts on public database health", () => {
    const publicHealth = toPublicDatabaseHealth();
    expect(publicHealth).toEqual(
      expect.objectContaining({
        enabled: expect.any(Boolean),
        ok: expect.any(Boolean),
        persistent: expect.any(Boolean),
        ephemeralRisk: expect.any(Boolean),
      })
    );
    expect(publicHealth).not.toHaveProperty("path");
    expect(publicHealth).not.toHaveProperty("users");
    expect(publicHealth).not.toHaveProperty("products");
    expect(publicHealth).not.toHaveProperty("orders");
    expect(publicHealth.persistence).not.toHaveProperty("backupDir");
    expect(publicHealth.persistence).not.toHaveProperty("renderDisk");
    expect(JSON.stringify(publicHealth)).not.toMatch(/[/\\]server[/\\]data[/\\]/);
  });

  it("fails closed on an unlisted mutating route without a policy", () => {
    expect(resolveRoutePermission("POST", "/api/vehicles/seed")).toBeNull();
    const guarded = wrapRouteHandler("POST", "/api/vehicles/seed", () => {
      throw new Error("handler must not run");
    });
    const res = mockRes();
    guarded(mockReq({ url: "/api/vehicles/seed" }), res);
    expect(res.statusCode).toBe(401);
  });

  it("keeps documented storefront cart writes public", () => {
    expect(resolveRoutePermission("POST", "/api/commerce/cart")).toEqual({ public: true });
    let called = false;
    const handler = wrapRouteHandler("POST", "/api/commerce/cart", () => {
      called = true;
    });
    handler(mockReq({ url: "/api/commerce/cart" }), mockRes());
    expect(called).toBe(true);
  });

  it("requires orders.write for commerce payment fail and reconcile", () => {
    expect(resolveRoutePermission("POST", "/api/commerce/payments/pay_1/fail")).toEqual({
      permission: "orders.write",
    });
    expect(resolveRoutePermission("POST", "/api/commerce/payments/pay_1/reconcile")).toEqual({
      permission: "orders.write",
    });
    const fail = wrapRouteHandler("POST", "/api/commerce/payments/:id/fail", () => {
      throw new Error("handler must not run");
    });
    const res = mockRes();
    fail(mockReq({ url: "/api/commerce/payments/pay_1/fail" }), res);
    expect(res.statusCode).toBe(401);
  });

  it("requires auth for previously open diagnostic GET routes", () => {
    expect(resolveRoutePermission("GET", "/api/p1/status")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/p1/health")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/p1/i18n/gaps")).toEqual({
      permission: "system.read",
    });
    expect(resolveRoutePermission("GET", "/api/guardian/status")).toEqual({
      permission: "system.read",
    });
    expect(resolveRoutePermission("GET", "/api/guardian/health")).toEqual({
      permission: "system.read",
    });
    const guardStatus = wrapRouteHandler("GET", "/api/guardian/status", () => {
      throw new Error("handler must not run");
    });
    const guardRes = mockRes();
    guardStatus(mockReq({ method: "GET", url: "/api/guardian/status" }), guardRes);
    expect(guardRes.statusCode).toBe(401);
    expect(resolveRoutePermission("GET", "/api/orchestrator/status")).toEqual({
      permission: "system.read",
    });
    expect(resolveRoutePermission("GET", "/api/orchestrator/agents")).toEqual({
      permission: "system.read",
    });
    const orchStatus = wrapRouteHandler("GET", "/api/orchestrator/status", () => {
      throw new Error("handler must not run");
    });
    const orchRes = mockRes();
    orchStatus(mockReq({ method: "GET", url: "/api/orchestrator/status" }), orchRes);
    expect(orchRes.statusCode).toBe(401);
    expect(resolveRoutePermission("GET", "/api/health/pusat")).toEqual({
      permission: "system.read",
    });
    expect(resolveRoutePermission("GET", "/api/health/software")).toEqual({
      permission: "system.read",
    });
    const pusatHealth = wrapRouteHandler("GET", "/api/health/pusat", () => {
      throw new Error("handler must not run");
    });
    const pusatHealthRes = mockRes();
    pusatHealth(mockReq({ method: "GET", url: "/api/health/pusat" }), pusatHealthRes);
    expect(pusatHealthRes.statusCode).toBe(401);
    const softwareHealth = wrapRouteHandler("GET", "/api/health/software", () => {
      throw new Error("handler must not run");
    });
    const softwareHealthRes = mockRes();
    softwareHealth(mockReq({ method: "GET", url: "/api/health/software" }), softwareHealthRes);
    expect(softwareHealthRes.statusCode).toBe(401);
    expect(resolveRoutePermission("GET", "/api/health")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/db/status")).toEqual({
      permission: "orders.read",
    });

    const gaps = wrapRouteHandler("GET", "/api/p1/i18n/gaps", () => {
      throw new Error("handler must not run");
    });
    const gapsRes = mockRes();
    gaps(mockReq({ method: "GET", url: "/api/p1/i18n/gaps" }), gapsRes);
    expect(gapsRes.statusCode).toBe(401);

    const dbStatus = wrapRouteHandler("GET", "/api/db/status", () => {
      throw new Error("handler must not run");
    });
    const dbRes = mockRes();
    dbStatus(mockReq({ method: "GET", url: "/api/db/status" }), dbRes);
    expect(dbRes.statusCode).toBe(401);
  });

  it("keeps guest commerce reads public at the wrapper and handler-guarded", () => {
    expect(resolveRoutePermission("GET", "/api/commerce/cart/cart_1")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/commerce/checkout/chk_1")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/commerce/orders/ord_1")).toEqual({ public: true });
  });

  it("rejects unauthenticated GET of JSON orders and commerce payments", () => {
    expect(resolveRoutePermission("GET", "/api/orders/BZ-1")).toEqual({
      authenticated: true,
      realm: "customer",
    });
    expect(resolveRoutePermission("GET", "/api/commerce/payments/pay_1")).toEqual({
      permission: "orders.read",
    });
    const orderGet = wrapRouteHandler("GET", "/api/orders/:orderNumber", () => {
      throw new Error("handler must not run");
    });
    const orderRes = mockRes();
    orderGet(mockReq({ method: "GET", url: "/api/orders/BZ-1" }), orderRes);
    expect(orderRes.statusCode).toBe(401);

    const payGet = wrapRouteHandler("GET", "/api/commerce/payments/:id", () => {
      throw new Error("handler must not run");
    });
    const payRes = mockRes();
    payGet(mockReq({ method: "GET", url: "/api/commerce/payments/pay_1" }), payRes);
    expect(payRes.statusCode).toBe(401);
  });

  it("does not mark a finance intent succeeded from a confirm call", () => {
    const created = paymentsFinance.createPaymentIntent({
      orderNumber: `SEC-FIN-${Date.now()}`,
      amount: 19.5,
      provider: "stripe",
      idempotencyKey: `sec-fin-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    });
    if (created.error) {
      expect(created.error).toBeTruthy();
      return;
    }
    const before = created.intent.status;
    const confirmed = paymentsFinance.confirmPaymentIntent(created.intent.id);
    expect(confirmed.applied).toBe(false);
    expect(confirmed.reason).toBe("PROVIDER_CONFIRMATION_REQUIRED");
    expect(confirmed.status).toBe(409);
    const refunded = paymentsFinance.createRefund(created.intent.id, { amount: 1 });
    expect(refunded.applied).toBe(false);
    expect(refunded.financialEffect).toBe(false);
    expect(refunded.status).toBe(409);
    const { db } = require("../lib/db");
    const after = db.prepare("SELECT status FROM finance_payment_intents WHERE id = ?").get(created.intent.id);
    expect(after.status).toBe(before);
    expect(after.status).not.toBe("succeeded");
  });
});
