import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

function sign(body, secret, timestamp) {
  const payload = timestamp ? `${timestamp}.${body}` : body;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

describe("secure commerce — payment, confirmation, delivery", () => {
  let software;
  let db;
  let sc;
  const secret = "test-webhook-secret-not-production";

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    require("../lib/pusat").initialize(db);
    software.initialize(db);
    sc = software.secureCommerce;
  });

  function freshOrder(prefix = "ord") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }

  function signedEvent(payment, overrides = {}) {
    const event = {
      paymentId: payment.id,
      eventId: overrides.eventId || `evt-${crypto.randomBytes(4).toString("hex")}`,
      eventType: overrides.eventType || "capture",
      targetState: overrides.targetState || sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
      amount: overrides.amount ?? payment.amountCents / 100,
      currency: overrides.currency || payment.currency,
      rawBody: overrides.rawBody || JSON.stringify({ id: "body" }),
      signature: overrides.signature,
      secret: overrides.secret === undefined ? secret : overrides.secret,
      timestamp: overrides.timestamp,
      timeout: overrides.timeout,
    };
    if (event.signature === undefined) {
      event.signature = sign(event.rawBody, secret, event.timestamp);
    }
    return event;
  }

  it("pending payment cannot ship", () => {
    const orderId = freshOrder();
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 20, currency: "EUR" });
    const gate = sc.shipmentGate.evaluate(db, {
      orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
      signatureInput: { salePrice: 20, acquisitionCost: 10, carrierSupportsSignature: true },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("CAPTURE_REQUIRED");
    expect(gate.shipmentCreated).toBe(false);
  });

  it("authorization alone cannot ship when capture is required", () => {
    const orderId = freshOrder();
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 20, currency: "EUR" });
    const auth = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    expect(auth.ok).toBe(true);
    const gate = sc.shipmentGate.evaluate(db, {
      orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: false,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
      signatureInput: { salePrice: 20, acquisitionCost: 10, carrierSupportsSignature: true },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("CAPTURE_REQUIRED");
  });

  it("captured payment still needs confirmation and risk before shipping", () => {
    const orderId = freshOrder();
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 20, currency: "EUR" });
    const captured = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    expect(captured.ok).toBe(true);
    const capture2 = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
    }));
    expect(capture2.ok).toBe(true);
    const withoutConfirm = sc.shipmentGate.evaluate(db, {
      orderId,
      paymentId: created.payment.id,
      expectedAmount: 20,
      confirmationRequired: true,
      riskInput: { amount: 20, currency: "EUR", expectedAmount: 20, expectedCurrency: "EUR", providerStatus: "ok" },
      signatureInput: { salePrice: 20, acquisitionCost: 10, carrierSupportsSignature: true },
    });
    expect(withoutConfirm.allowed).toBe(false);
    expect(withoutConfirm.reasons).toContain("CUSTOMER_NO_RESPONSE");
  });

  it("wrong amount and unsupported currency fail closed", () => {
    const usd = sc.paymentLifecycle.createPayment(db, { orderId: freshOrder(), amount: 10, currency: "USD" });
    expect(usd.failClosed).toBe(true);
    expect(usd.reason).toBe("CURRENCY_UNSUPPORTED");
    const created = sc.paymentLifecycle.createPayment(db, { orderId: freshOrder(), amount: 20, currency: "EUR" });
    const mismatch = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, { amount: 19 }));
    expect(mismatch.ok).toBe(false);
    expect(mismatch.reason).toBe("AMOUNT_CURRENCY_MISMATCH");
  });

  it("forged webhook is rejected and duplicate event is idempotent", () => {
    const created = sc.paymentLifecycle.createPayment(db, { orderId: freshOrder(), amount: 15, currency: "EUR" });
    const forged = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, { signature: "deadbeef" }));
    expect(forged.accepted).toBe(false);
    expect(forged.reason).toBe("WEBHOOK_SIGNATURE_INVALID");
    const eventId = `evt-dup-${Date.now()}`;
    const first = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      eventId,
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    const second = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      eventId,
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    expect(first.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.financialEffect).toBe(false);
  });

  it("provider timeout is not success and illegal transitions are rejected", () => {
    const created = sc.paymentLifecycle.createPayment(db, { orderId: freshOrder(), amount: 12, currency: "EUR" });
    const timeout = sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, { timeout: true }));
    expect(timeout.success).toBe(false);
    expect(timeout.requiresReconciliation).toBe(true);
    expect(sc.paymentLifecycle.getPayment(db, created.payment.id).state).toBe(
      sc.constants.PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED
    );
    const rewind = sc.paymentLifecycle.applyState(
      db,
      created.payment.id,
      sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
      "out-of-order-capture"
    );
    expect(rewind.ok).toBe(false);
    expect(rewind.reason).toBe("RECONCILIATION_CAPTURE_REQUIRES_HUMAN");
    const capturedDirect = sc.paymentLifecycle.createPayment(db, { orderId: freshOrder(), amount: 12, currency: "EUR" });
    const captured = sc.paymentLifecycle.applyState(
      db,
      capturedDirect.payment.id,
      sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
      "direct-capture"
    );
    expect(captured.ok).toBe(true);
    const fromCapturedToPending = sc.paymentLifecycle.applyState(
      db,
      capturedDirect.payment.id,
      sc.constants.PAYMENT_STATE.PAYMENT_PENDING,
      "rewind"
    );
    expect(fromCapturedToPending.ok).toBe(false);
    expect(fromCapturedToPending.reason).toBe("ILLEGAL_TRANSITION");
  });

  it("client payment status never authorizes shipment", () => {
    const proof = sc.paymentLifecycle.clientStatusIsNotProof("SUCCESS");
    expect(proof.authoritative).toBe(false);
    expect(proof.shipmentAuthorized).toBe(false);
  });

  it("chargeback after capture updates state without rewriting history silently", () => {
    const orderId = freshOrder();
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 30, currency: "EUR" });
    sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
    }));
    const dispute = sc.disputes.open(db, {
      orderId,
      paymentId: created.payment.id,
      kind: sc.constants.DISPUTE_KIND.CHARGEBACK,
      eventId: `cb-${orderId}`,
    });
    expect(dispute.ok).toBe(true);
    expect(sc.paymentLifecycle.getPayment(db, created.payment.id).state).toBe(sc.constants.PAYMENT_STATE.CHARGEBACK);
    const dup = sc.disputes.open(db, {
      orderId,
      paymentId: created.payment.id,
      kind: sc.constants.DISPUTE_KIND.CHARGEBACK,
      eventId: `cb-${orderId}`,
    });
    expect(dup.duplicate).toBe(true);
  });

  it("dry-run transfer is not irreversible and unknown status does not retry blindly", () => {
    const drafted = sc.reserveTransfers.draftTransfer(db, {
      orderId: freshOrder(),
      amount: 40,
      currency: "EUR",
      idempotencyKey: `xfer-${Date.now()}`,
    });
    expect(drafted.executed).toBe(false);
    expect(drafted.irreversible).toBe(false);
    const again = sc.reserveTransfers.draftTransfer(db, {
      orderId: drafted.transfer.orderId,
      amount: 40,
      currency: "EUR",
      idempotencyKey: drafted.transfer.details ? drafted.ok && `xfer-${Date.now()}` : undefined,
    });
    const keyed = sc.reserveTransfers.draftTransfer(db, {
      orderId: freshOrder(),
      amount: 5,
      currency: "EUR",
      idempotencyKey: "same-transfer-key",
    });
    const keyed2 = sc.reserveTransfers.draftTransfer(db, {
      orderId: freshOrder(),
      amount: 5,
      currency: "EUR",
      idempotencyKey: "same-transfer-key",
    });
    expect(keyed2.duplicate).toBe(true);
    expect(sc.reserveTransfers.executeReal().executed).toBe(false);
    const unknown = sc.reserveTransfers.markUnknown(db, keyed.transfer.id, "timeout");
    expect(unknown.requiresReconciliation).toBe(true);
    expect(unknown.retryDuplicateForbidden).toBe(true);
    expect(sc.reserveTransfers.fail(db, again.transfer.id, "provider_failed").executed).toBe(false);
    expect(sc.reserveTransfers.exposure(4000, 1000, 500).reserveDoesNotEliminateLiability).toBe(true);
    expect(keyed.ok).toBe(true);
  });

  it("customer confirmation: valid, GET, expire, replay, wrong order, reject, rate limit", () => {
    const orderId = freshOrder("conf");
    const challenge = sc.orderConfirmation.createChallenge(db, {
      orderId,
      customerId: "cust-a",
      locale: "en",
      ttlMs: 60_000,
    });
    expect(challenge.sent).toBe(false);
    expect(challenge.message.body).toMatch(/never ask for your password/i);
    const get = sc.orderConfirmation.previewGet(db, challenge.token);
    expect(get.confirmed).toBe(false);
    expect(get.consumed).toBe(false);
    const wrong = sc.orderConfirmation.act(db, { token: challenge.token, orderId: "other", confirm: true });
    expect(wrong.reason).toBe("WRONG_ORDER");
    const ok = sc.orderConfirmation.act(db, { token: challenge.token, orderId, confirm: true, method: "POST" });
    expect(ok.state).toBe(sc.constants.CONFIRMATION_STATE.CUSTOMER_CONFIRMED);
    const replay = sc.orderConfirmation.act(db, { token: challenge.token, orderId, confirm: true });
    expect(replay.reason).toBe("TOKEN_REPLAY");

    const short = sc.orderConfirmation.createChallenge(db, {
      orderId: freshOrder("exp"),
      locale: "de",
      ttlMs: -1000,
    });
    const expired = sc.orderConfirmation.act(db, { token: short.token, orderId: short.orderId, confirm: true });
    expect(expired.reason).toBe("EXPIRED");

    const rejectOrder = freshOrder("rej");
    const rejectCh = sc.orderConfirmation.createChallenge(db, { orderId: rejectOrder, locale: "tr" });
    const rejected = sc.orderConfirmation.act(db, { token: rejectCh.token, orderId: rejectOrder, reject: true });
    expect(rejected.state).toBe(sc.constants.CONFIRMATION_STATE.CUSTOMER_REJECTED);

    const limited = sc.orderConfirmation.createChallenge(db, { orderId: freshOrder("rl"), locale: "fr" });
    expect(limited.message.fallback).toBe(true);
    for (let i = 0; i < sc.orderConfirmation.MAX_ATTEMPTS; i += 1) {
      sc.orderConfirmation.act(db, { token: "nope", orderId: limited.orderId, confirm: true });
    }
    db.prepare("UPDATE software_confirmations SET attempts = ? WHERE id = ?").run(
      sc.orderConfirmation.MAX_ATTEMPTS,
      limited.id
    );
    const limitedAct = sc.orderConfirmation.act(db, { token: limited.token, orderId: limited.orderId, confirm: true });
    expect(limitedAct.reason).toBe("RATE_LIMITED");
  });

  it("confirmation without capture does not authorize shipment", () => {
    const orderId = freshOrder("cnp");
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 18, currency: "EUR" });
    const challenge = sc.orderConfirmation.createChallenge(db, { orderId, locale: "en" });
    sc.orderConfirmation.act(db, { token: challenge.token, orderId, confirm: true });
    const gate = sc.shipmentGate.evaluate(db, {
      orderId,
      paymentId: created.payment.id,
      expectedAmount: 18,
      confirmationRequired: true,
      riskInput: { amount: 18, currency: "EUR", expectedAmount: 18, expectedCurrency: "EUR", providerStatus: "ok" },
      signatureInput: { salePrice: 18, acquisitionCost: 8, carrierSupportsSignature: true },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("CAPTURE_REQUIRED");
  });

  it("risk outcomes stay explainable and unknown provider is not low risk", () => {
    const low = sc.paymentRisk.assess({
      amount: 20,
      currency: "EUR",
      expectedAmount: 20,
      expectedCurrency: "EUR",
      providerStatus: "ok",
    });
    expect(low.outcome).toBe(sc.constants.RISK_OUTCOME.LOW_RISK);
    const missing = sc.paymentRisk.assess({ providerStatus: "UNKNOWN" });
    expect(missing.outcome).toBe(sc.constants.RISK_OUTCOME.REVIEW_REQUIRED);
    expect(missing.providerUnknownIsNotLowRisk).toBe(true);
    const conflict = sc.paymentRisk.assess({
      amount: 20,
      currency: "EUR",
      expectedAmount: 20,
      expectedCurrency: "EUR",
      providerStatus: "ok",
      addressMismatch: true,
    });
    expect(conflict.outcome).toBe(sc.constants.RISK_OUTCOME.REVIEW_REQUIRED);
    expect(conflict.addressMismatchIsNotFraudProof).toBe(true);
    const highValue = sc.paymentRisk.assess({
      amount: 400,
      currency: "EUR",
      expectedAmount: 400,
      expectedCurrency: "EUR",
      providerStatus: "ok",
    });
    expect(highValue.reasons).toContain("HIGH_VALUE");
    const blocked = sc.paymentRisk.assess({
      amount: 20,
      currency: "EUR",
      expectedAmount: 9,
      expectedCurrency: "EUR",
      providerStatus: "ok",
    });
    expect(blocked.outcome).toBe(sc.constants.RISK_OUTCOME.HIGH_RISK_BLOCKED);
    const resolved = sc.paymentRisk.resolveReview(conflict, "approve");
    expect(resolved.falsePositivePath).toBe(true);
    expect(sc.paymentRisk.assess({ providerUnavailable: true }).outcome).toBe(
      sc.constants.RISK_OUTCOME.REVIEW_REQUIRED
    );
  });

  it("signature policy requires service or review and ignores customer override", () => {
    const high = sc.signaturePolicy.evaluate({
      salePrice: 200,
      acquisitionCost: 40,
      carrierSupportsSignature: true,
    });
    expect(high.requireSignature).toBe(true);
    const noCarrier = sc.signaturePolicy.evaluate({
      salePrice: 200,
      acquisitionCost: 40,
      carrierSupportsSignature: false,
    });
    expect(noCarrier.allowAutomaticShipment).toBe(false);
    const surcharge = sc.signaturePolicy.evaluate({
      salePrice: 12,
      acquisitionCost: 11.6,
      signatureSurcharge: 1,
      carrierSupportsSignature: true,
    });
    expect(surcharge.reasons).toContain("BELOW_MIN_NET_PROFIT");
    const override = sc.signaturePolicy.evaluate({
      salePrice: 200,
      acquisitionCost: 40,
      carrierSupportsSignature: true,
      customerDeclinesSignature: true,
    });
    expect(override.customerOverrideAllowed).toBe(false);
    expect(override.liabilityWaiverInvented).toBe(false);
    const riskBlock = sc.signaturePolicy.evaluate({
      salePrice: 20,
      acquisitionCost: 5,
      riskOutcome: "HIGH_RISK_BLOCKED",
      carrierSupportsSignature: true,
    });
    expect(riskBlock.allowAutomaticShipment).toBe(false);
  });

  it("delivery evidence kinds are not interchangeable and duplicates are safe", () => {
    const shipment = software.tracking.createShipment(db, {
      orderId: freshOrder("ship"),
      customerId: "owner-ev",
      trackingNumber: `DHL${Date.now()}`,
    });
    const delivered = sc.deliveryProof.record(db, {
      shipmentId: shipment.shipment.id,
      orderId: shipment.shipment.orderId,
      kind: sc.constants.EVIDENCE_KIND.DELIVERED_STATUS,
      carrierEventId: "ev-1",
    });
    const signed = sc.deliveryProof.record(db, {
      shipmentId: shipment.shipment.id,
      orderId: shipment.shipment.orderId,
      kind: sc.constants.EVIDENCE_KIND.SIGNATURE,
      carrierEventId: "ev-2",
      verified: true,
    });
    const dup = sc.deliveryProof.record(db, {
      shipmentId: shipment.shipment.id,
      orderId: shipment.shipment.orderId,
      kind: sc.constants.EVIDENCE_KIND.DELIVERED_STATUS,
      carrierEventId: "ev-1",
    });
    expect(delivered.deliveredIsNotSignature).toBe(true);
    expect(signed.verified).toBe(true);
    expect(dup.duplicate).toBe(true);
    const view = sc.deliveryProof.interpret(sc.deliveryProof.listForShipment(db, shipment.shipment.id));
    expect(view.interchangeable).toBe(false);
    expect(view.carrierSaysDelivered).toBe(true);
    expect(view.signatureEvidence).toBe(true);
    expect(sc.deliveryProof.record(db, { invented: true }).reason).toBe("INVENTED_EVIDENCE_REJECTED");
  });

  it("GPS rules reject fabrication and keep planned destination off the proof path", () => {
    const shipment = software.tracking.createShipment(db, {
      orderId: freshOrder("gps"),
      customerId: "owner-gps",
      trackingNumber: `UPS${Date.now()}`,
    });
    expect(sc.locationEvidence.record(db, { invented: true }).reason).toBe("GPS_FABRICATION_REJECTED");
    expect(sc.locationEvidence.record(db, {
      shipmentId: shipment.shipment.id,
      kind: sc.constants.LOCATION_KIND.VERIFIED_DELIVERY,
      latitude: 200,
      longitude: 10,
      source: "carrier_verified",
    }).reason).toBe("INVALID_COORDINATES");
    const planned = sc.locationEvidence.record(db, {
      shipmentId: shipment.shipment.id,
      kind: sc.constants.LOCATION_KIND.PLANNED_DESTINATION,
      treatAsDeliveryProof: true,
    });
    expect(planned.reason).toBe("PLANNED_DESTINATION_NOT_PROOF");
    const dest = sc.locationEvidence.record(db, {
      shipmentId: shipment.shipment.id,
      kind: sc.constants.LOCATION_KIND.PLANNED_DESTINATION,
      latitude: 52.52,
      longitude: 13.4,
    });
    expect(dest.deliveryProof).toBe(false);
    const estimated = sc.locationEvidence.record(db, {
      shipmentId: shipment.shipment.id,
      kind: sc.constants.LOCATION_KIND.ESTIMATED,
      labelAsVerified: true,
    });
    expect(estimated.reason).toBe("ESTIMATED_IS_NOT_VERIFIED");
    const verified = sc.locationEvidence.record(db, {
      shipmentId: shipment.shipment.id,
      kind: sc.constants.LOCATION_KIND.VERIFIED_DELIVERY,
      latitude: 52.52,
      longitude: 13.405,
      source: "carrier_verified",
      authorized: true,
      occurredAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    });
    expect(verified.ok).toBe(true);
    const hidden = sc.locationEvidence.view(db, shipment.shipment.id, { authorized: false });
    expect(hidden.find((row) => row.kind === "verified_delivery").unauthorized).toBe(true);
    const shown = sc.locationEvidence.view(db, shipment.shipment.id, { authorized: true });
    expect(shown.find((row) => row.kind === "verified_delivery").stale).toBe(true);
    expect(shown.every((row) => row.gpsInvented === false)).toBe(true);
  });

  it("refunds stay distinct from supplier credit and shipment gate stays cumulative", () => {
    const orderId = freshOrder("full");
    const created = sc.paymentLifecycle.createPayment(db, { orderId, amount: 22, currency: "EUR" });
    sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_AUTHORIZED,
    }));
    sc.paymentLifecycle.ingestEvent(db, signedEvent(created.payment, {
      targetState: sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
    }));
    const challenge = sc.orderConfirmation.createChallenge(db, { orderId, locale: "en" });
    sc.orderConfirmation.act(db, { token: challenge.token, orderId, confirm: true });
    sc.identitySignals.record(db, {
      orderId,
      declaredName: "Ada",
      declaredDeliveryAddress: "Office",
      verificationSource: null,
    });
    const gate = sc.shipmentGate.evaluate(db, {
      orderId,
      paymentId: created.payment.id,
      expectedAmount: 22,
      confirmationRequired: true,
      riskInput: { amount: 22, currency: "EUR", expectedAmount: 22, expectedCurrency: "EUR", providerStatus: "ok" },
      signatureInput: { salePrice: 22, acquisitionCost: 10, carrierSupportsSignature: true },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("SALES_LOCKED");
    expect(gate.checks.confirmationIsNotPayment).toBe(true);

    const refund = software.returns.openCase(db, {
      orderNumber: orderId,
      customerId: "cust-fin",
      reason: "test-secure-commerce",
    });
    expect(refund.supplierCredit.assumedFromCustomerRefund).toBe(false);
    expect(refund.customerRefund.executed).toBe(false);
  });

  it("capability matrix never marks mock or Bundesbank live", () => {
    const matrix = sc.paymentProviders.capabilityMatrix();
    expect(matrix.every((row) => row.liveVerified === false)).toBe(true);
    expect(matrix.find((row) => row.id === "deutsche_bundesbank").class).toBe("NOT_IMPLEMENTED");
    expect(matrix.find((row) => row.id === "mock").note).toMatch(/Never a live bank/);
    expect(sc.paymentProviders.verifyPayment({ timeout: true }).reason).toBe("PROVIDER_TIMEOUT_NOT_SUCCESS");
    expect(sc.paymentProviders.verifyPayment({ provider: "stripe" }).reason).toBe("NOT_CONFIGURED");
    expect(software.connectorInventory.paymentBankConnectors().find((row) => row.id === "deutsche_bundesbank").liveVerified).toBe(false);
    expect(sc.flags().salesEnabled).toBe(false);
    expect(sc.flags().realMoneyMovement).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
