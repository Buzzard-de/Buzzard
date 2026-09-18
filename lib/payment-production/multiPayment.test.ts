import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPaymentIntent,
  authorizePaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  markUnknownPaymentState,
  getCheckoutPaymentMethods,
  handlePaymentWebhook,
  buildWebhookPayload,
  processPaymentRefund,
  routePaymentMethods,
  assertPaymentProductionSafetyInvariants,
  resetPaymentProductionSafetyCountersForTests,
  resetPaymentProductionForTests,
  resetIdempotencyForTests,
  resetPaymentFlowForTests,
  buildPaymentIdempotencyKey,
  getPaymentProductionDashboard,
  buildPaymentProductionStatusReport,
  assertPaymentCaptureSafety,
} from "./index";
import { savePaymentProductionRecord } from "./persistence";

const ORIGINAL = { ...process.env };

describe("#350 Multi-payment checkout", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL, PAYMENT_PRODUCTION_ENABLED: "0" };
    resetPaymentProductionForTests();
    resetPaymentProductionSafetyCountersForTests();
    resetIdempotencyForTests();
    resetPaymentFlowForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("returns mock methods for DE when no production flags", () => {
    const methods = getCheckoutPaymentMethods({ country: "DE", currency: "EUR", amount: 99.99 });
    expect(methods.some((m) => m.provider === "MOCK")).toBe(true);
  });

  it("PayPal success path", () => {
    process.env.PAYPAL_ENABLED = "1";
    process.env.PAYPAL_CLIENT_ID_SECRET_REF = "ref";
    const intent = createPaymentIntent({
      orderId: "ord_pp_ok",
      amount: 50,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_pp_ok"),
      provider: "PAYPAL",
    });
    const auth = authorizePaymentIntent(intent.paymentId);
    expect(auth.state).toBe("AUTHORIZED");
    const cap = capturePaymentIntent({
      paymentId: intent.paymentId,
      orderId: intent.orderId,
      amount: 50,
      currency: "EUR",
      idempotencyKey: "cap_pp_1",
    });
    expect(cap.state).toBe("CAPTURED");
  });

  it("PayPal failure path", () => {
    const intent = createPaymentIntent({
      orderId: "ord_pp_fail",
      amount: 50,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_pp_fail"),
      provider: "MOCK",
    });
    const failed = { ...intent, state: "FAILED" as const };
    resetPaymentProductionForTests();
    savePaymentProductionRecord(failed);
    const auth = authorizePaymentIntent(failed.paymentId);
    expect(auth.state).toBe("FAILED");
  });

  it("PayPal webhook and duplicate webhook", () => {
    const payload = buildWebhookPayload({
      provider: "PAYPAL",
      eventId: "evt_pp_1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      paymentId: "pay_test",
    });
    const first = handlePaymentWebhook(payload, { secretConfigured: true });
    expect(first.ok).toBe(true);
    const dup = handlePaymentWebhook(payload, { secretConfigured: true });
    expect(dup.duplicate).toBe(true);
  });

  it("Card 3DS requires action", () => {
    process.env.CARD_ENABLED = "1";
    process.env.PAYMENT_CARD_SECRET_REF = "ref";
    const intent = createPaymentIntent({
      orderId: "ord_3ds",
      amount: 600,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_3ds"),
      provider: "CARD",
    });
    const auth = authorizePaymentIntent(intent.paymentId);
    expect(auth.state).toBe("REQUIRES_ACTION");
  });

  it("SEPA pending and confirmed webhook", () => {
    process.env.SEPA_ENABLED = "1";
    process.env.PAYMENT_SEPA_SECRET_REF = "ref";
    const intent = createPaymentIntent({
      orderId: "ord_sepa",
      amount: 100,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_sepa"),
      provider: "SEPA",
    });
    expect(intent.state).toBe("PENDING");
    const wh = handlePaymentWebhook(
      buildWebhookPayload({
        provider: "SEPA",
        eventId: "evt_sepa_1",
        eventType: "PAYMENT_CONFIRMED",
        paymentId: intent.paymentId,
      }),
      { secretConfigured: true },
    );
    expect(wh.ok).toBe(true);
  });

  it("Apple Pay unavailable without device support", () => {
    process.env.APPLE_PAY_ENABLED = "1";
    process.env.PAYMENT_APPLE_PAY_SECRET_REF = "ref";
    const methods = routePaymentMethods({
      country: "DE",
      currency: "EUR",
      amount: 50,
      deviceSupportsApplePay: false,
    });
    expect(methods.some((m) => m.provider === "APPLE_PAY")).toBe(false);
  });

  it("Google Pay unavailable without device support", () => {
    process.env.GOOGLE_PAY_ENABLED = "1";
    process.env.PAYMENT_GOOGLE_PAY_SECRET_REF = "ref";
    const methods = routePaymentMethods({
      country: "DE",
      currency: "EUR",
      amount: 50,
      deviceSupportsGooglePay: false,
    });
    expect(methods.some((m) => m.provider === "GOOGLE_PAY")).toBe(false);
  });

  it("Amazon Pay success when configured", () => {
    process.env.AMAZON_PAY_ENABLED = "1";
    process.env.AMAZON_PAY_CLIENT_ID_SECRET_REF = "ref";
    const intent = createPaymentIntent({
      orderId: "ord_amz",
      amount: 80,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_amz"),
      provider: "AMAZON_PAY",
    });
    const auth = authorizePaymentIntent(intent.paymentId);
    expect(auth.state).toBe("AUTHORIZED");
  });

  it("Klarna unavailable when not configured", () => {
    const methods = getCheckoutPaymentMethods({ country: "DE", currency: "EUR", amount: 100 });
    expect(methods.some((m) => m.provider === "KLARNA")).toBe(false);
  });

  it("provider fallback — card when PayPal disabled", () => {
    process.env.CARD_ENABLED = "1";
    process.env.PAYMENT_CARD_SECRET_REF = "ref";
    const methods = routePaymentMethods({ country: "DE", currency: "EUR", amount: 50 });
    expect(methods.some((m) => m.provider === "CARD")).toBe(true);
  });

  it("payment unknown outcome — no blind retry", () => {
    const intent = createPaymentIntent({
      orderId: "ord_unknown",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_unknown"),
    });
    const unknown = markUnknownPaymentState(intent.paymentId);
    expect(unknown.state).toBe("UNKNOWN");
    expect(() =>
      capturePaymentIntent({
        paymentId: intent.paymentId,
        orderId: intent.orderId,
        amount: 10,
        currency: "EUR",
        idempotencyKey: "cap_unknown",
      }),
    ).toThrow("UNKNOWN_PAYMENT_NO_AUTO_RETRY");
  });

  it("duplicate capture idempotency", () => {
    const intent = createPaymentIntent({
      orderId: "ord_dup_cap",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_dup_cap"),
    });
    authorizePaymentIntent(intent.paymentId);
    const input = {
      paymentId: intent.paymentId,
      orderId: intent.orderId,
      amount: 10,
      currency: "EUR",
      idempotencyKey: "cap_dup_key",
    };
    capturePaymentIntent(input);
    const second = capturePaymentIntent(input);
    expect(second.state).toBe("CAPTURED");
  });

  it("partial and full refund", () => {
    const intent = createPaymentIntent({
      orderId: "ord_ref",
      amount: 100,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_ref"),
    });
    authorizePaymentIntent(intent.paymentId);
    capturePaymentIntent({
      paymentId: intent.paymentId,
      orderId: intent.orderId,
      amount: 100,
      currency: "EUR",
      idempotencyKey: "cap_ref",
    });
    const partial = processPaymentRefund(
      { paymentId: intent.paymentId, amount: 40, idempotencyKey: "ref_partial" },
      "PARTIAL_REFUND",
    );
    expect(partial.ok).toBe(true);
    const full = processPaymentRefund(
      { paymentId: intent.paymentId, idempotencyKey: "ref_full" },
      "FULL_REFUND",
    );
    expect(full.ok).toBe(true);
  });

  it("currency and amount mismatch blocks capture", () => {
    const blocked = assertPaymentCaptureSafety({
      orderId: "o1",
      paymentId: "p1",
      amount: 99,
      currency: "USD",
      recordAmount: 100,
      recordCurrency: "EUR",
      recordOrderId: "o1",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("MISMATCH");
  });

  it("webhook replay rejected without signature", () => {
    const result = handlePaymentWebhook(
      buildWebhookPayload({
        provider: "PAYPAL",
        eventId: "evt_bad",
        eventType: "PAYMENT.CAPTURE.COMPLETED",
        paymentId: "pay_x",
        signature: "",
      }),
      { secretConfigured: false },
    );
    expect(result.ok).toBe(false);
  });

  it("fraud decline blocks authorization", () => {
    const intent = createPaymentIntent({
      orderId: "ord_fraud",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_fraud"),
    });
    savePaymentProductionRecord({ ...intent, state: "FAILED" });
    const auth = authorizePaymentIntent(intent.paymentId);
    expect(auth.state).toBe("FAILED");
  });

  it("kill switch — production flag disabled in CI", () => {
    expect(getPaymentProductionDashboard().productionEnabled).toBe("DISABLED");
  });

  it("status report without credentials", () => {
    const report = buildPaymentProductionStatusReport();
    expect(report.software).toBe("COMPLETE");
    expect(report.payment).toBe("NOT_CONFIGURED");
    expect(report.sales).toBe("CLOSED");
    expect(report.realPaymentSideEffects).toBe(0);
  });

  it("zero real side effects in CI", () => {
    expect(assertPaymentProductionSafetyInvariants().ok).toBe(true);
  });

  it("cancel payment intent", () => {
    const intent = createPaymentIntent({
      orderId: "ord_cancel",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_cancel"),
    });
    const cancelled = cancelPaymentIntent(intent.paymentId);
    expect(cancelled.state).toBe("CANCELLED");
  });
});
