import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("order, payment, and return infrastructure — established fail-closed", () => {
  it("keeps sales off, live payments off, and never creates a commercial order", () => {
    const software = require("../lib/software");
    const inspect = software.orderPaymentReturnIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.livePaymentsEnabled).toBe(false);
    expect(inspect.commercialCreated).toBe(false);
    expect(inspect.realMoneyMovement).toBe(false);
    expect(inspect.stripeLiveVerified).toBe(false);
    expect(inspect.paypalLiveVerified).toBe(false);
    expect(inspect.unsignedCanMarkPaid).toBe(false);
    const commercial = software.orderPaymentReturnIntegrity.createCommercialOrder({ actor: "operator", forcePlace: true });
    expect(commercial.commercialCreated).toBe(false);
    expect(commercial.charged).toBe(false);
    expect(["SALES_DISABLED", "FIRST_ORDER_HUMAN_REQUIRED", "HUMAN_FIRST_ORDER_REQUIRED"]).toContain(commercial.reason);
  });

  it("blocks live Stripe/PayPal charge, confirm, refund, unsigned webhook, and UNCERTAIN retry", async () => {
    const { orderPaymentReturnIntegrity } = require("../lib/software");
    const stripe = await orderPaymentReturnIntegrity.liveCharge("stripe", { expectedAmount: 10, currency: "EUR" });
    expect(stripe.realMoneyMovement).toBe(false);
    expect(stripe.paid).toBe(false);
    expect(["LIVE_HTTP_BLOCKED", "NOT_CONFIGURED"]).toContain(stripe.reason);
    const paypal = await orderPaymentReturnIntegrity.liveCharge("paypal", { expectedAmount: 10, currency: "EUR" });
    expect(paypal.realMoneyMovement).toBe(false);
    expect(orderPaymentReturnIntegrity.confirmPayment().reason).toBe("PROVIDER_CONFIRMATION_REQUIRED");
    expect(orderPaymentReturnIntegrity.executeRefund().reason).toBe("PROVIDER_REFUND_REQUIRED");
    expect(orderPaymentReturnIntegrity.executeRefund().refundExecuted).toBe(false);
    const webhook = orderPaymentReturnIntegrity.unsignedWebhook();
    expect(webhook.markedPaid).toBe(false);
    expect(webhook.reason).toBe("WEBHOOK_SIGNATURE_MISSING");
    const retry = orderPaymentReturnIntegrity.retryUncertain({ amount: 10 });
    expect(retry.refusedRetry).toBe(true);
    expect(retry.paid).toBe(false);
    const clientPaid = orderPaymentReturnIntegrity.acceptClientPaid("paid");
    expect(clientPaid.accepted).toBe(false);
    expect(clientPaid.paid).toBe(false);
  });

  it("keeps returns independent of supplier credit and blocks guest value mint / IDOR", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    const opened = software.orderPaymentReturnIntegrity.openReturn(db, {
      orderNumber: `OPR-${Date.now()}`,
      customerId: "cust_opr",
      reason: "defective",
      refundAmount: 12,
    });
    expect(opened.ok).toBe(true);
    expect(opened.refundExecuted).toBe(false);
    expect(opened.supplierCredit.assumedFromCustomerRefund).toBe(false);
    expect(opened.estimated.invented).toBe(false);
    const guest = software.orderPaymentReturnIntegrity.guestResource({ resourceType: "order" });
    expect(guest.blocked).toBe(true);
    expect(guest.status).toBe(401);
    const idor = software.orderPaymentReturnIntegrity.guestResource({
      resourceType: "order",
      resourceCustomerId: "cust_a",
      requestCustomerId: "cust_b",
    });
    expect(idor.code).toBe("idor_denied");
    const loyalty = software.orderPaymentReturnIntegrity.mintLoyaltyFromGuest();
    expect(loyalty.minted).toBe(false);
    expect(loyalty.valueCreated).toBe(false);
    expect(software.orderPaymentReturnIntegrity.financeWriteAuthz().publicMarkPaid).toBe(false);
  });
});
