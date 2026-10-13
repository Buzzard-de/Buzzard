import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

const COST = {
  supplierCost: 10,
  shippingCost: 2,
  extraCosts: 0.5,
  returnReserve: 0.4,
  marketplaceCommissionRate: 0.12,
  taxRate: 0.19,
  currency: "EUR",
  listPrice: 32,
};

describe("order identity + QR loyalty — Phase 3", () => {
  let software;
  let db;
  let orderAutomation;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    orderAutomation = require("../lib/orderAutomation");
    require("../lib/pusat").initialize(db);
    software.initialize(db);
  });

  it("maps OMS, commerce and marketplace refs to one canonical id without rewriting stores", () => {
    const omsNumber = `BZ-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const commerceId = `ord_${crypto.randomBytes(4).toString("hex")}`;
    const first = software.orderIdentity.ensureBound(db, {
      refs: [
        { kind: "OMS_ID", value: String(900000 + Date.now() % 100000) },
        { kind: "OMS_NUMBER", value: omsNumber },
        { kind: "COMMERCE_ID", value: commerceId },
      ],
    });
    expect(first.ok).toBe(true);
    expect(first.canonicalId.startsWith("bzord_")).toBe(true);
    expect(first.rewrittenStores).toBe(false);
    expect(software.orderIdentity.resolve(db, omsNumber).canonicalId).toBe(first.canonicalId);
    expect(software.orderIdentity.resolve(db, commerceId).canonicalId).toBe(first.canonicalId);
    expect(software.orderIdentity.describeContract().destructiveMigration).toBe(false);
  });

  it("fails closed on ambiguous and mismatched order identities", () => {
    const a = software.orderIdentity.ensureBound(db, { refs: [{ kind: "LEGACY_RAW", value: `A-${Date.now()}` }] });
    const b = software.orderIdentity.ensureBound(db, { refs: [{ kind: "LEGACY_RAW", value: `B-${Date.now()}` }] });
    const clash = software.orderIdentity.ensureBound(db, {
      refs: [
        { kind: "LEGACY_RAW", value: a.bound[0].value },
        { kind: "LEGACY_RAW", value: b.bound[0].value },
      ],
    });
    expect(clash.ok).toBe(false);
    expect(clash.reason).toBe("AMBIGUOUS_ORDER_IDENTITY");
    const mismatch = software.orderIdentity.assertSameOrder(db, a.canonicalId, b.canonicalId);
    expect(mismatch.ok).toBe(false);
    expect(mismatch.reason).toBe("ORDER_IDENTITY_MISMATCH");
    expect(software.orderIdentity.resolve(db, "missing-order-ref").reason).toBe("UNRESOLVED_ORDER_REF");
  });

  it("consumes reservations under any alias of the same canonical order once", () => {
    const sku = `IDN-${Date.now()}`;
    const omsNumber = `BZ-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const commerceId = `ord_${crypto.randomBytes(4).toString("hex")}`;
    software.orderIdentity.ensureBound(db, {
      refs: [
        { kind: "OMS_NUMBER", value: omsNumber },
        { kind: "COMMERCE_ID", value: commerceId },
      ],
    });
    const reserved = software.orderInventoryBridge.reserveForOrder(db, {
      sku,
      quantity: 2,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      orderId: omsNumber,
    });
    expect(reserved.ok).toBe(true);
    const otherEvent = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId: omsNumber,
      eventOrderRef: commerceId + "-other",
      official: true,
      payment: { captured: true, state: "PAYMENT_CAPTURED", amountCents: 1990, currency: "EUR" },
    });
    expect(otherEvent.ok).toBe(false);
    expect(["UNRESOLVED_ORDER_REF", "ORDER_IDENTITY_MISMATCH"]).toContain(otherEvent.reason);

    const consumed = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId: commerceId,
      eventOrderRef: omsNumber,
      official: true,
      payment: { captured: true, state: "PAYMENT_CAPTURED", amountCents: 1990, currency: "EUR" },
    });
    expect(consumed.ok).toBe(true);
    expect(consumed.consumed).toBe(1);
    const again = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId: omsNumber,
      official: true,
      payment: { captured: true, state: "PAYMENT_CAPTURED", amountCents: 1990, currency: "EUR" },
    });
    expect(again.results.every((row) => row.duplicate === true)).toBe(true);
  });

  it("unsigned webhook still cannot mark paid and QR cannot bypass payment", () => {
    const orderNumber = `QR-UNS-${Date.now()}`;
    orderAutomation.ensureFlow(orderNumber);
    const webhook = orderAutomation.handlePaymentWebhook({
      provider: "stripe",
      eventId: `evt_${orderNumber}`,
      orderNumber,
      status: "paid",
    });
    expect(webhook.applied).toBe(false);
    expect(webhook.reason).toBe("UNSIGNED_WEBHOOK_ISOLATED");
    const scanGrant = software.qrLoyalty.evaluateEligibility(db, {
      customerId: "cust-scan",
      qrScanOnly: true,
      captured: true,
      paymentState: "PAYMENT_CAPTURED",
      orderRef: orderNumber,
    });
    expect(scanGrant.ok).toBe(false);
    expect(scanGrant.reason).toBe("QR_SCAN_NOT_AUTHORITY");
  });

  it("issues privacy-safe customer and package QR codes with allowlisted redirects", () => {
    const customerId = `cust-qr-${Date.now()}`;
    const issued = software.qrLoyalty.issueCustomerQr(db, { customerId });
    expect(issued.ok).toBe(true);
    expect(issued.piiIncluded).toBe(false);
    expect(issued.authenticates).toBe(false);
    expect(issued.payload.id).toMatch(/^bzqr_/);
    expect(JSON.stringify(issued.payload)).not.toMatch(/@|email|iban/i);
    const open = software.qrLoyalty.safeRedirect("https://evil.example/phish");
    expect(open.ok).toBe(false);
    expect(software.qrLoyalty.safeRedirect("/kampanya/qr/").ok).toBe(true);
    const scan = software.qrLoyalty.recordScan(db, { token: issued.token, marketingConsent: false });
    expect(scan.grantsDiscount).toBe(false);
    expect(scan.authenticates).toBe(false);
    const other = software.qrLoyalty.revealAccount(db, { token: issued.token, requesterCustomerId: "someone-else" });
    expect(other.denied).toBe(true);
    const pkg = software.qrLoyalty.issuePackageQr(db, {
      orderRef: `ord_pkg_${Date.now()}`,
      packageRef: "pkg-1",
      attributionSource: "AMAZON",
    });
    expect(pkg.eligibilityStatus).toBe("REVIEW_REQUIRED");
    expect(pkg.piiIncluded).toBe(false);
    expect(pkg.published).toBe(false);
  });

  it("second-purchase entitlement is server-side, concurrency-safe, and profit-gated", () => {
    const customerId = `cust-loy-${Date.now()}`;
    const first = `ord_first_${crypto.randomBytes(3).toString("hex")}`;
    const second = `ord_second_${crypto.randomBytes(3).toString("hex")}`;
    const eligible = software.qrLoyalty.evaluateEligibility(db, {
      customerId,
      orderRef: first,
      captured: true,
      paymentState: "PAYMENT_CAPTURED",
      costInput: COST,
    });
    expect(eligible.ok).toBe(true);
    expect(eligible.state).toBe("ELIGIBLE");
    expect(eligible.discount.appliedPercent).toBeLessThanOrEqual(15);
    expect(eligible.discount.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(eligible.discount.coversEveryOrderExpense).toBe(false);

    const cancelled = software.qrLoyalty.evaluateEligibility(db, {
      customerId: `${customerId}-c`,
      orderRef: `${first}-c`,
      captured: true,
      paymentState: "PAYMENT_CAPTURED",
      cancelled: true,
      costInput: COST,
    });
    expect(cancelled.state).toBe("NOT_ELIGIBLE");
    expect(cancelled.reason).toBe("FIRST_ORDER_CANCELLED");

    const pending = software.qrLoyalty.evaluateEligibility(db, {
      customerId: `${customerId}-p`,
      orderRef: `${first}-p`,
      captured: true,
      paymentState: "PAYMENT_CAPTURED",
      unresolvedReturn: true,
      costInput: COST,
    });
    expect(pending.state).toBe("PENDING_RETURN_WINDOW");

    const checkout = `chk-${Date.now()}`;
    const reserved = software.qrLoyalty.reserve(db, {
      customerId,
      checkoutId: checkout,
      idempotencyKey: `idem-${customerId}`,
      costInput: COST,
    });
    expect(reserved.ok).toBe(true);
    const reservedAgain = software.qrLoyalty.reserve(db, {
      customerId,
      checkoutId: checkout,
      idempotencyKey: `idem-${customerId}`,
      costInput: COST,
    });
    expect(reservedAgain.duplicate).toBe(true);
    const failed = software.qrLoyalty.releaseReservation(db, { customerId, checkoutId: checkout, failedCheckout: true });
    expect(failed.released).toBe(true);
    expect(failed.entitlementPreserved).toBe(true);

    const reserved2 = software.qrLoyalty.reserve(db, { customerId, checkoutId: `${checkout}-2`, costInput: COST });
    expect(reserved2.ok).toBe(true);
    const stacked = software.qrLoyalty.redeem(db, {
      customerId,
      secondOrderRef: second,
      otherDiscountApplied: true,
      costInput: COST,
    });
    expect(stacked.ok).toBe(false);
    expect(stacked.reason).toBe("STACKING_FORBIDDEN");
    const redeemed = software.qrLoyalty.redeem(db, { customerId, secondOrderRef: second, costInput: COST });
    expect(redeemed.ok).toBe(true);
    expect(redeemed.state).toBe("REDEEMED");
    expect(redeemed.liveOrderCreated).toBe(false);
    const twice = software.qrLoyalty.redeem(db, { customerId, secondOrderRef: `${second}-x`, costInput: COST });
    expect(twice.ok).toBe(false);

    const missingCost = software.qrLoyalty.evaluateDiscount({ currency: "EUR" }, 15);
    expect(missingCost.failClosed).toBe(true);
  });

  it("late return on another order cannot mutate this entitlement", () => {
    const customerId = `cust-late-${Date.now()}`;
    const first = `ord_late_${crypto.randomBytes(3).toString("hex")}`;
    const other = `ord_other_${crypto.randomBytes(3).toString("hex")}`;
    software.qrLoyalty.evaluateEligibility(db, {
      customerId,
      orderRef: first,
      captured: true,
      paymentState: "PAYMENT_CAPTURED",
      costInput: COST,
    });
    software.orderIdentity.ensureBound(db, { refs: [software.orderIdentity.refFromValue(other)] });
    const foreign = software.qrLoyalty.reevaluateForOrder(db, {
      orderRef: first,
      eventOrderRef: other,
      returned: true,
    });
    expect(foreign.results.some((row) => row.reason === "ORDER_IDENTITY_MISMATCH")).toBe(true);
    const late = software.qrLoyalty.reevaluateForOrder(db, {
      orderRef: first,
      eventOrderRef: first,
      returned: true,
    });
    expect(late.results[0].state).toBe("REVOKED");
  });

  it("analytics do not invent CAC/LTV or count scans as sales", () => {
    const report = software.qrLoyalty.analytics(db);
    expect(report.invented).toBe(false);
    expect(report.scansAreNotSales).toBe(true);
    expect(report.cac).toBeNull();
    expect(report.ltv).toBeNull();
    expect(report.liveCampaign).toBe(false);
    expect(software.qrLoyalty.privacyNotes().legalComplianceProven).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE).not.toBe("1");
    expect(process.env.BUZZARD_LIVE_PAYMENTS).not.toBe("1");
  });
});
