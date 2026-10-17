import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

function stripeSignature(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return { header: `t=${timestamp},v1=${v1}`, timestamp };
}

function paypalHeaders() {
  return {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/mock-cert",
    "paypal-transmission-id": `tx-${crypto.randomBytes(4).toString("hex")}`,
    "paypal-transmission-sig": "mock-sig",
    "paypal-transmission-time": new Date().toISOString(),
  };
}

describe("dual Stripe/PayPal adapters — existing payment engine", () => {
  let software;
  let db;
  let engine;
  let sc;
  const stripeSecret = "whsec_test_not_production";

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    require("../lib/pusat").initialize(db);
    software.initialize(db);
    sc = software.secureCommerce;
    engine = sc.dualPaymentEngine;
  });

  function orderId(prefix = "ord") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }

  function stripeClient(overrides = {}) {
    const paymentIntentId = overrides.paymentIntentId || `pi_${crypto.randomBytes(4).toString("hex")}`;
    const sessionId = overrides.sessionId || `cs_${crypto.randomBytes(4).toString("hex")}`;
    return {
      paymentIntentId,
      async createCheckoutSession() {
        if (overrides.timeout) throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
        if (overrides.unavailable) throw Object.assign(new Error("down"), { code: "UNAVAILABLE" });
        return {
          id: sessionId,
          url: "https://checkout.stripe.test/mock",
          payment_intent: paymentIntentId,
        };
      },
      async retrievePayment() {
        if (overrides.timeout) throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
        if (overrides.unavailable) throw Object.assign(new Error("down"), { code: "UNAVAILABLE" });
        return {
          id: paymentIntentId,
          status: overrides.status || "succeeded",
          amountCents: overrides.amountCents || 2000,
          currency: overrides.currency || "EUR",
          captured: (overrides.status || "succeeded") === "succeeded",
        };
      },
    };
  }

  function paypalClient(overrides = {}) {
    const paypalOrderId = overrides.paypalOrderId || `PAYPAL-${crypto.randomBytes(4).toString("hex")}`;
    return {
      paypalOrderId,
      async createOrder() {
        if (overrides.timeout) throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
        if (overrides.unavailable) throw Object.assign(new Error("down"), { code: "UNAVAILABLE" });
        return {
          id: paypalOrderId,
          status: overrides.createStatus || "CREATED",
          links: [{ rel: "approve", href: "https://paypal.test/approve" }],
        };
      },
      async retrieveOrder() {
        if (overrides.timeout) throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
        if (overrides.unavailable) throw Object.assign(new Error("down"), { code: "UNAVAILABLE" });
        return {
          id: paypalOrderId,
          status: overrides.status || "CREATED",
          purchase_units: [
            {
              amount: { value: "20.00", currency_code: "EUR" },
              payments: {
                captures: overrides.captures || [],
              },
            },
          ],
        };
      },
    };
  }

  async function stripeWebhook(payment, event, extra = {}) {
    const rawBody = JSON.stringify(event);
    const signed = stripeSignature(rawBody, extra.secret || stripeSecret, extra.timestamp);
    return engine.handleWebhook(
      db,
      {
        provider: "stripe",
        rawBody,
        headers: { "stripe-signature": extra.signature || signed.header },
        secret: extra.secret || stripeSecret,
        paymentId: extra.paymentId || payment.id,
        nowSeconds: extra.nowSeconds,
        toleranceSeconds: extra.toleranceSeconds,
      },
      extra.deps || {}
    );
  }

  async function paypalWebhook(payment, event, extra = {}) {
    const rawBody = JSON.stringify(event);
    return engine.handleWebhook(
      db,
      {
        provider: "paypal",
        rawBody,
        headers: extra.headers || paypalHeaders(),
        paymentId: extra.paymentId || payment.id,
        verifyFn: extra.verifyFn === undefined ? async () => ({ verification_status: "SUCCESS" }) : extra.verifyFn,
      },
      extra.deps || {}
    );
  }

  it("A stripe createPayment uses server amount and ignores client paid claim", async () => {
    const created = await engine.createPayment(
      db,
      {
        provider: "stripe",
        orderId: orderId("st-create"),
        expectedAmount: 20,
        expectedCurrency: "EUR",
        clientAmount: 20,
        clientStatus: "PAID",
        idempotencyKey: `st-create-${crypto.randomBytes(4).toString("hex")}`,
      },
      { client: stripeClient() }
    );
    expect(created.ok).toBe(true);
    expect(created.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_REQUIRES_CUSTOMER_ACTION);
    expect(created.payment.captured).toBe(false);
    expect(created.checkoutUrl).toContain("checkout.stripe.test");
    expect(created.shipmentAuthorized).toBe(false);
    expect(created.realMoneyMovement).toBe(false);
    expect(engine.clientCannotMarkPaid("PAID").shipmentAuthorized).toBe(false);
  });

  it("A stripe amount and currency tampering are rejected", async () => {
    const amount = await engine.createPayment(db, {
      provider: "stripe",
      orderId: orderId("st-amt"),
      expectedAmount: 20,
      clientAmount: 1,
    });
    expect(amount.ok).toBe(false);
    expect(amount.reason).toBe("AMOUNT_TAMPERING");
    const currency = await engine.createPayment(db, {
      provider: "stripe",
      orderId: orderId("st-cur"),
      expectedAmount: 20,
      expectedCurrency: "EUR",
      clientCurrency: "USD",
    });
    expect(currency.ok).toBe(false);
    expect(currency.reason).toBe("CURRENCY_TAMPERING");
  });

  it("A stripe webhook accepts official signature and rejects a bad one", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-sig"), expectedAmount: 20, idempotencyKey: `sig-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: `pi_sig_${crypto.randomBytes(3).toString("hex")}` }) }
    );
    const event = {
      id: `evt_ok_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_sig", amount: 2000, currency: "eur", status: "succeeded" } },
    };
    const good = await stripeWebhook(created.payment, event);
    expect(good.accepted).toBe(true);
    expect(good.payment.captured).toBe(true);
    expect(good.shipmentAuthorized).toBe(false);
    expect(good.inventoryCommit === null || good.inventoryCommit.shipmentAuthorized === false).toBe(true);
    const badTs = Math.floor(Date.now() / 1000);
    const bad = await stripeWebhook(created.payment, { ...event, id: `evt_bad_${crypto.randomBytes(3).toString("hex")}` }, { signature: `t=${badTs},v1=deadbeef` });
    expect(bad.accepted).toBe(false);
    expect(bad.reason).toBe("WEBHOOK_SIGNATURE_INVALID");
    expect(bad.shipmentAuthorized).toBe(false);
  });

  it("A stripe duplicate webhook is applied once", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-dup"), expectedAmount: 20, idempotencyKey: `dup-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_dup" }) }
    );
    const event = {
      id: `evt_dup_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_dup", amount: 2000, currency: "eur", status: "succeeded" } },
    };
    const first = await stripeWebhook(created.payment, event);
    const second = await stripeWebhook(created.payment, event);
    expect(first.applied).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.applied).toBe(false);
  });

  it("A stripe out-of-order capture does not regress after a later stale authorized event", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-ooo"), expectedAmount: 20, idempotencyKey: `ooo-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_ooo" }) }
    );
    const captured = await stripeWebhook(created.payment, {
      id: `evt_cap_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_ooo", amount: 2000, currency: "eur", status: "succeeded" } },
    });
    expect(captured.payment.captured).toBe(true);
    const stale = await stripeWebhook(created.payment, {
      id: `evt_auth_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.amount_capturable_updated",
      data: { object: { id: "pi_ooo", amount: 2000, currency: "eur" } },
    });
    expect(stale.ok).toBe(false);
    expect(engine.retrievePayment(db, created.payment.id).payment.captured).toBe(true);
  });

  it("A stripe timeout is not payment success", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-to"), expectedAmount: 20, idempotencyKey: `to-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ timeout: true }) }
    );
    expect(created.reason).toBe("PROVIDER_TIMEOUT_NOT_SUCCESS");
    expect(created.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED);
    expect(created.shipmentAuthorized).toBe(false);
  });

  it("A stripe failed payment and invalid order stay unpaid", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-fail"), expectedAmount: 20, idempotencyKey: `fail-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_fail" }) }
    );
    const failed = await stripeWebhook(created.payment, {
      id: `evt_fail_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_fail", amount: 2000, currency: "eur" } },
    });
    expect(failed.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_FAILED);
    expect(failed.shipmentAuthorized).toBe(false);
    const orphan = await stripeWebhook(
      { id: "missing" },
      {
        id: `evt_orphan_${crypto.randomBytes(3).toString("hex")}`,
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_unknown", amount: 2000, currency: "eur", status: "succeeded" } },
      },
      { paymentId: "not-a-payment" }
    );
    expect(orphan.reason).toBe("PAYMENT_NOT_FOUND");
    expect(orphan.shipmentAuthorized).toBe(false);
  });

  it("A stripe provider unavailable fails closed", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("st-un"), expectedAmount: 20, idempotencyKey: `un-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ unavailable: true }) }
    );
    expect(created.ok).toBe(false);
    expect(created.reason).toBe("PROVIDER_UNAVAILABLE");
    expect(created.shipmentAuthorized).toBe(false);
  });

  it("B paypal create, approval without capture, and capture pending", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-create"), expectedAmount: 20, idempotencyKey: `pp-c-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ paypalOrderId: "PAYPAL-FLOW" }) }
    );
    expect(created.ok).toBe(true);
    expect(created.approvalUrl).toContain("paypal.test");
    expect(created.payment.captured).toBe(false);

    const approved = await paypalWebhook(created.payment, {
      id: `WH-APP-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: "PAYPAL-FLOW", amount: { value: "20.00", currency_code: "EUR" } },
    });
    expect(approved.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED);
    expect(approved.payment.captured).toBe(false);
    const gateApproved = engine.evaluateShipment(db, {
      orderId: created.payment.orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
    });
    expect(gateApproved.allowed).toBe(false);
    expect(gateApproved.reasons).toContain("CAPTURE_REQUIRED");

    const pending = await paypalWebhook(created.payment, {
      id: `WH-PEND-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "PAYMENT.CAPTURE.PENDING",
      resource: { id: "PAYPAL-FLOW", amount: { value: "20.00", currency_code: "EUR" } },
    });
    expect(pending.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_CAPTURE_PENDING);
    expect(pending.shipmentAuthorized).toBe(false);
  });

  it("B paypal verified capture, invalid verify, duplicate and out-of-order", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-cap"), expectedAmount: 20, idempotencyKey: `pp-cap-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ paypalOrderId: "PAYPAL-CAP" }) }
    );
    const event = {
      id: `WH-CAP-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "PAYPAL-CAP", amount: { value: "20.00", currency_code: "EUR" } },
    };
    const captured = await paypalWebhook(created.payment, event);
    expect(captured.payment.captured).toBe(true);
    const dup = await paypalWebhook(created.payment, event);
    expect(dup.duplicate).toBe(true);
    const stale = await paypalWebhook(created.payment, {
      id: `WH-STALE-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: "PAYPAL-CAP", amount: { value: "20.00", currency_code: "EUR" } },
    });
    expect(stale.ok).toBe(false);
    expect(engine.retrievePayment(db, created.payment.id).payment.captured).toBe(true);

    const invalid = await paypalWebhook(
      created.payment,
      { id: `WH-BAD-${crypto.randomBytes(3).toString("hex")}`, event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "PAYPAL-CAP" } },
      { verifyFn: async () => ({ verification_status: "FAILURE" }) }
    );
    expect(invalid.accepted).toBe(false);
    expect(invalid.reason).toBe("WEBHOOK_SIGNATURE_INVALID");
    expect(invalid.inventoryCommit).toBeFalsy();
  });

  it("official captured webhook consumes reserved stock once and never authorizes shipment", async () => {
    const oid = orderId("inv-cap");
    const sku = `INV-${Date.now()}`;
    const reserved = software.orderInventoryBridge.reserveForOrder(db, {
      sku,
      quantity: 2,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      orderId: oid,
    });
    expect(reserved.ok).toBe(true);
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: oid, expectedAmount: 20, idempotencyKey: `inv-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: `pi_inv_${crypto.randomBytes(3).toString("hex")}` }) }
    );
    const event = {
      id: `evt_inv_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: created.payment.providerPaymentId || "pi_inv", amount: 2000, currency: "eur", status: "succeeded" } },
    };
    const captured = await stripeWebhook(created.payment, event);
    expect(captured.applied).toBe(true);
    expect(captured.payment.captured).toBe(true);
    expect(captured.inventoryCommit.ok).toBe(true);
    expect(captured.inventoryCommit.consumed).toBe(1);
    expect(captured.shipmentAuthorized).toBe(false);

    const again = await stripeWebhook(created.payment, event);
    expect(again.duplicate).toBe(true);
    expect(again.applied).toBe(false);
    expect(again.inventoryCommit).toBeFalsy();
    const row = db.prepare("SELECT status FROM software_reservations WHERE order_id = ?").get(oid);
    expect(row.status).toBe("CONSUMED");
  });

  it("B paypal timeout, cancel, mismatch, invalid order, unavailable", async () => {
    const timeout = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-to"), expectedAmount: 20, idempotencyKey: `pp-to-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ timeout: true }) }
    );
    expect(timeout.reason).toBe("PROVIDER_TIMEOUT_NOT_SUCCESS");

    const created = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-can"), expectedAmount: 20, idempotencyKey: `pp-can-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ paypalOrderId: "PAYPAL-CAN" }) }
    );
    const cancelled = await paypalWebhook(created.payment, {
      id: `WH-CAN-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "CHECKOUT.ORDER.VOIDED",
      resource: { id: "PAYPAL-CAN", amount: { value: "20.00", currency_code: "EUR" } },
    });
    expect(cancelled.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_CANCELLED);

    const mismatchPay = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-mm"), expectedAmount: 20, idempotencyKey: `pp-mm-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ paypalOrderId: "PAYPAL-MM" }) }
    );
    const mismatch = await paypalWebhook(mismatchPay.payment, {
      id: `WH-MM-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "PAYPAL-MM", amount: { value: "99.00", currency_code: "EUR" } },
    });
    expect(mismatch.reason).toBe("AMOUNT_CURRENCY_MISMATCH");
    expect(mismatch.shipmentAuthorized).toBe(false);

    const orphan = await paypalWebhook({ id: "x" }, {
      id: `WH-OR-${crypto.randomBytes(3).toString("hex")}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "unknown", amount: { value: "20.00", currency_code: "EUR" } },
    }, { paymentId: "missing-paypal" });
    expect(orphan.reason).toBe("PAYMENT_NOT_FOUND");

    const unavailable = await engine.createPayment(
      db,
      { provider: "paypal", orderId: orderId("pp-un"), expectedAmount: 20, idempotencyKey: `pp-un-${crypto.randomBytes(3).toString("hex")}` },
      { client: paypalClient({ unavailable: true }) }
    );
    expect(unavailable.reason).toBe("PROVIDER_UNAVAILABLE");
  });

  it("C client paid claim, browser redirect and unverified webhook cannot ship", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("sec"), expectedAmount: 20, idempotencyKey: `sec-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_sec" }) }
    );
    const redirect = engine.evaluateShipment(db, {
      orderId: created.payment.orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      browserRedirectSuccess: true,
      frontendSuccess: true,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
    });
    expect(redirect.allowed).toBe(false);
    expect(redirect.reasons).toContain("CLIENT_STATUS_NOT_AUTHORITATIVE");

    const unverified = engine.evaluateShipment(db, {
      orderId: created.payment.orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      unverifiedWebhook: true,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
    });
    expect(unverified.reasons).toContain("UNVERIFIED_WEBHOOK");

    const timeoutGate = engine.evaluateShipment(db, {
      orderId: created.payment.orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      providerTimeout: true,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
    });
    expect(timeoutGate.reasons).toContain("PROVIDER_TIMEOUT_NOT_SUCCESS");
  });

  it("C duplicate create is idempotent and concurrent duplicate webhooks stay safe", async () => {
    const key = `idem-${crypto.randomBytes(4).toString("hex")}`;
    const first = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("idem"), expectedAmount: 20, idempotencyKey: key },
      { client: stripeClient({ paymentIntentId: "pi_idem" }) }
    );
    const second = await engine.createPayment(
      db,
      { provider: "stripe", orderId: first.payment.orderId, expectedAmount: 20, idempotencyKey: key },
      { client: stripeClient({ paymentIntentId: "pi_idem" }) }
    );
    expect(second.duplicate).toBe(true);
    expect(second.payment.id).toBe(first.payment.id);

    const event = {
      id: `evt_conc_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_idem", amount: 2000, currency: "eur", status: "succeeded" } },
    };
    const [a, b] = await Promise.all([stripeWebhook(first.payment, event), stripeWebhook(first.payment, event)]);
    expect([a.applied, b.applied].filter(Boolean).length).toBe(1);
    expect([a.duplicate, b.duplicate].some(Boolean)).toBe(true);
  });

  it("C refund, chargeback and supplier credit stay distinct; reconcile never moves money", async () => {
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("dist"), expectedAmount: 20, idempotencyKey: `dist-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_dist" }) }
    );
    await stripeWebhook(created.payment, {
      id: `evt_dist_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_dist", amount: 2000, currency: "eur", status: "succeeded" } },
    });
    const refund = engine.recordRefundStatus(db, created.payment.id, { partial: true });
    expect(refund.realRefund).toBe(false);
    expect(refund.distinctFromChargeback).toBe(true);
    expect(refund.distinctFromSupplierCredit).toBe(true);
    expect(refund.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_PARTIALLY_REFUNDED);

    const other = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("cb"), expectedAmount: 20, idempotencyKey: `cb-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_cb" }) }
    );
    await stripeWebhook(other.payment, {
      id: `evt_cb_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_cb", amount: 2000, currency: "eur", status: "succeeded" } },
    });
    const dispute = engine.recordDisputeStatus(db, other.payment.id, { chargeback: true });
    expect(dispute.payment.state).toBe(sc.constants.PAYMENT_STATE.CHARGEBACK);
    expect(dispute.distinctFromRefund).toBe(true);

    const reconcile = await engine.reconcilePayment(db, created.payment.id, {
      client: stripeClient({ paymentIntentId: "pi_dist", amountCents: 9999 }),
    });
    expect(reconcile.executed).toBe(false);
    expect(reconcile.financialEffect).toBe(false);
    expect(reconcile.mismatch).toBe(true);
    expect(reconcile.payment.state).toBe(sc.constants.PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED);
  });

  it("C sales lock and inactive Product SoT remain in force; no live money", async () => {
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE).not.toBe("1");
    const created = await engine.createPayment(
      db,
      { provider: "stripe", orderId: orderId("lock"), expectedAmount: 20, idempotencyKey: `lock-${crypto.randomBytes(3).toString("hex")}` },
      { client: stripeClient({ paymentIntentId: "pi_lock" }) }
    );
    await stripeWebhook(created.payment, {
      id: `evt_lock_${crypto.randomBytes(3).toString("hex")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_lock", amount: 2000, currency: "eur", status: "succeeded" } },
    });
    const gate = engine.evaluateShipment(db, {
      orderId: created.payment.orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("SALES_LOCKED");
    expect(gate.shipmentCreated).toBe(false);

    const integrations = require("../lib/commercialIntegrations");
    const previous = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_secret";
    const session = await integrations.createStripeCheckoutSession({ orderId: "x", amount: 20, currency: "EUR" });
    if (previous == null) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
    expect(session.executed).toBe(false);
    expect(session.realMoneyMovement).toBe(false);
    expect(session.checkoutUrl).toBeNull();
    expect(session.reason).toBe("LIVE_HTTP_BLOCKED");

    const diagnostics = engine.providerDiagnostics({ mockTestsPassed: true });
    expect(diagnostics.liveVerified).toBe(false);
    expect(diagnostics.sandboxVerified).toBe(false);
    expect(diagnostics.stripe.liveVerified).toBe(false);
    expect(diagnostics.paypal.liveVerified).toBe(false);
    expect(diagnostics.stripe.status).toBe("TESTED_WITH_MOCKS");
  });
});
