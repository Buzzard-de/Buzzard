import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPaymentIntent,
  authorizePaymentIntent,
  capturePaymentIntent,
  markUnknownPaymentState,
  getPaymentProductionDashboard,
  assertPaymentProductionSafetyInvariants,
  resetPaymentProductionSafetyCountersForTests,
  resetPaymentProductionForTests,
  buildPaymentIdempotencyKey,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#350 Payment production", () => {
  beforeEach(() => {
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    resetPaymentProductionForTests();
    resetPaymentProductionSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("creates dry-run payment intent", () => {
    const intent = createPaymentIntent({
      orderId: "ord_p1",
      amount: 99.99,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_p1"),
    });
    expect(intent.dryRun).toBe(true);
    expect(intent.state).toBe("PENDING");
  });

  it("mock authorize and capture path", () => {
    const intent = createPaymentIntent({
      orderId: "ord_p2",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_p2"),
    });
    const auth = authorizePaymentIntent(intent.paymentId);
    expect(auth.state).toBe("AUTHORIZED");
    const cap = capturePaymentIntent(intent.paymentId);
    expect(cap.state).toBe("CAPTURED");
  });

  it("unknown payment state without blind retry", () => {
    const intent = createPaymentIntent({
      orderId: "ord_p3",
      amount: 10,
      currency: "EUR",
      idempotencyKey: buildPaymentIdempotencyKey("ord_p3"),
    });
    const unknown = markUnknownPaymentState(intent.paymentId);
    expect(unknown.state).toBe("UNKNOWN_PAYMENT_STATE");
  });

  it("dashboard production DISABLED", () => {
    const dash = getPaymentProductionDashboard();
    expect(dash.productionEnabled).toBe("DISABLED");
    expect(dash.liveStatus).toBe("NOT_CONFIGURED");
  });

  it("zero real charges in CI", () => {
    expect(assertPaymentProductionSafetyInvariants().ok).toBe(true);
  });
});
