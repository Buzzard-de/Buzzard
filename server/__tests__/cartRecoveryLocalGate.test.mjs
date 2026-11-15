import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const recovery = require("../lib/commerce/cartRecoveryGate.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const cart = require("../lib/commerce/cartGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");

const old = "2020-01-01T00:00:00.000Z";
const fresh = new Date().toISOString();

function abandoned(extra = {}) {
  return {
    customerId: "cust-1",
    cartCustomerId: "cust-1",
    cartId: "cart-1",
    cartStatus: "abandoned",
    abandonedAt: old,
    channel: "email",
    price: 19,
    currency: "EUR",
    items: [{ sku: "BZ-1" }],
    stock: 4,
    couponCode: "SAVE10",
    recovered: true,
    eligible: true,
    consent: true,
    abandoned: true,
    ...extra,
  };
}

describe("cart recovery does not message or sell", () => {
  it("rejects a mismatched, deleted, cancelled, active, or fresh cart", () => {
    const mismatch = recovery.assessCartRecovery(abandoned({ idempotencyKey: "own-1", cartCustomerId: "cust-2" }));
    expect(mismatch.code).toBe("CART_OWNER_MISMATCH");
    expect(mismatch.customerId).toBeNull();
    expect(mismatch.recovered).toBe(false);
    expect(mismatch.emailSent).toBe(false);

    const deleted = recovery.assessCartRecovery(abandoned({ idempotencyKey: "del-1", cartId: "cart-del", cartStatus: "deleted" }));
    expect(deleted.code).toBe("CART_DELETED");
    const cancelled = recovery.assessCartRecovery(abandoned({ idempotencyKey: "can-1", cartId: "cart-can", cartStatus: "cancelled" }));
    expect(cancelled.code).toBe("CART_CANCELLED");
    const ordered = recovery.assessCartRecovery(abandoned({ idempotencyKey: "ord-1", cartId: "cart-ord", orderId: "ord-1", orderStatus: "completed" }));
    expect(ordered.code).toBe("CART_NOT_ABANDONED");
    const active = recovery.assessCartRecovery(abandoned({ idempotencyKey: "act-1", cartId: "cart-act", cartStatus: "active", abandoned: true }));
    expect(active.code).toBe("CART_NOT_ABANDONED");
    const recent = recovery.assessCartRecovery(abandoned({ idempotencyKey: "new-1", cartId: "cart-new", abandonedAt: fresh }));
    expect(recent.code).toBe("CART_NOT_ABANDONED");
    for (const result of [deleted, cancelled, ordered, active, recent]) {
      expect(result.recovered).toBe(false);
      expect(result.sale).toBe(false);
      expect(result.orderCreated).toBe(false);
      expect(result.paymentCreated).toBe(false);
    }
  });

  it("does not invent price, stock, or a coupon, and does not send without channel consent", () => {
    const email = recovery.assessCartRecovery(abandoned({ idempotencyKey: "mail-1", cartId: "cart-mail" }));
    expect(email.code).toBe("CONSENT_UNKNOWN");
    expect(email.status).toBe("UNKNOWN");
    expect(email.callerFlagIgnored).toBe(true);
    expect(email.price).toBeNull();
    expect(email.currency).toBeNull();
    expect(email.items).toBeNull();
    expect(email.priceGuaranteed).toBe(false);
    expect(email.stockGuaranteed).toBe(false);
    expect(email.couponAdded).toBe(false);
    expect(email.emailSent).toBe(false);
    expect(email.smsSent).toBe(false);
    expect(email.revenue).toBeNull();
    expect(email.reasons).toContain("SALES_CLOSED");
    expect(email.productionReady).toBe(false);

    const sms = recovery.assessCartRecovery(abandoned({ idempotencyKey: "sms-1", cartId: "cart-sms", channel: "sms" }));
    expect(sms.code).toBe("CONSENT_UNKNOWN");
    expect(sms.channel).toBe("sms");
    expect(sms.smsSent).toBe(false);
    expect(sms.emailSent).toBe(false);

    consent.decideMarketingConsent({
      idempotencyKey: "withdraw-recovery",
      customerId: "cust-1",
      channel: "email",
      action: "withdraw",
      source: "account-settings",
      scope: "marketing-email",
      consentedAt: old,
    });
    const blocked = recovery.assessCartRecovery(abandoned({ idempotencyKey: "mail-2", cartId: "cart-mail-2", channel: "email" }));
    expect(blocked.code).toBe("CONSENT_WITHDRAWN");
    expect(blocked.emailSent).toBe(false);
    const smsSeparate = recovery.assessCartRecovery(abandoned({ idempotencyKey: "sms-2", cartId: "cart-sms-2", channel: "sms" }));
    expect(smsSeparate.code).toBe("CONSENT_UNKNOWN");
    expect(smsSeparate.smsSent).toBe(false);
    expect(smsSeparate.emailSent).toBe(false);
  });

  it("blocks a repeat, a synthetic cart, and a failed retry", () => {
    const synthetic = recovery.assessCartRecovery(abandoned({ idempotencyKey: "mock-1", cartId: "cart-mock", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_CART");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.recovered).toBe(false);
    expect(synthetic.messageSent).toBe(false);

    const first = recovery.assessCartRecovery(abandoned({ idempotencyKey: "dup-1", cartId: "cart-dup" }));
    const second = recovery.assessCartRecovery(abandoned({ idempotencyKey: "dup-1", cartId: "cart-dup", recovered: true }));
    expect(first.recovered).toBe(false);
    expect(second.code).toBe("DUPLICATE_RECOVERY");
    expect(second.duplicate).toBe(true);
    expect(second.paymentCreated).toBe(false);
    expect(second.reservationCreated).toBe(false);

    const failed = recovery.assessCartRecovery(abandoned({ idempotencyKey: "fail-1", cartId: "cart-fail", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.emailSent).toBe(false);
    const retried = recovery.retryCartRecovery("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.recovered).toBe(false);
    expect(retried.messageSent).toBe(false);
    expect(retried.orderCreated).toBe(false);
    expect(retried.paymentCreated).toBe(false);
    expect(retried.couponAdded).toBe(false);
    expect(recovery.retryCartRecovery("missing-recovery").code).toBe("RETRY_UNKNOWN");
  });

  it("reads email, sms, and push consent separately", () => {
    function record(extra) {
      return consent.decideMarketingConsent({
        source: "account-settings",
        scope: "marketing",
        consentedAt: old,
        consent: false,
        approved: false,
        verified: false,
        subscribed: false,
        ...extra,
      });
    }

    record({ idempotencyKey: "ch-a-email", customerId: "cust-a", channel: "email", action: "grant", scope: "marketing-email", consent: true });
    record({ idempotencyKey: "ch-a-push", customerId: "cust-a", channel: "push", action: "withdraw", scope: "marketing-push" });
    const seenA = consent.readMarketingConsent("cust-a");
    expect(seenA.emailPermission).toBe("BLOCKED");
    expect(seenA.pushPermission).toBe("WITHDRAWN");
    const pushClosed = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-a-cart",
      customerId: "cust-a",
      cartCustomerId: "cust-a",
      cartId: "cart-a",
      channel: "push",
    }));
    expect(pushClosed.code).toBe("CONSENT_WITHDRAWN");
    expect(pushClosed.channel).toBe("push");
    expect(pushClosed.recovered).toBe(false);
    expect(pushClosed.pushSent).toBe(false);
    expect(pushClosed.emailSent).toBe(false);
    expect(pushClosed.messageSent).toBe(false);

    record({ idempotencyKey: "ch-b-push", customerId: "cust-b", channel: "push", action: "grant", scope: "marketing-push", consent: true });
    record({ idempotencyKey: "ch-b-email", customerId: "cust-b", channel: "email", action: "withdraw", scope: "marketing-email" });
    const seenB = consent.readMarketingConsent("cust-b");
    expect(seenB.pushPermission).toBe("BLOCKED");
    expect(seenB.emailPermission).toBe("WITHDRAWN");
    const pushOwn = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-b-cart",
      customerId: "cust-b",
      cartCustomerId: "cust-b",
      cartId: "cart-b",
      channel: "push",
    }));
    expect(pushOwn.code).toBe("CONSENT_REQUIRED");
    expect(pushOwn.pushSent).toBe(false);
    expect(pushOwn.emailSent).toBe(false);
    expect(pushOwn.recovered).toBe(false);

    record({ idempotencyKey: "ch-c-sms", customerId: "cust-c", channel: "sms", action: "grant", scope: "marketing-sms", consent: true });
    record({ idempotencyKey: "ch-c-email", customerId: "cust-c", channel: "email", action: "withdraw", scope: "marketing-email" });
    const smsOwn = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-c-cart",
      customerId: "cust-c",
      cartCustomerId: "cust-c",
      cartId: "cart-c",
      channel: "sms",
    }));
    expect(consent.readMarketingConsent("cust-c").smsPermission).toBe("BLOCKED");
    expect(consent.readMarketingConsent("cust-c").emailPermission).toBe("WITHDRAWN");
    expect(smsOwn.code).toBe("CONSENT_REQUIRED");
    expect(smsOwn.smsSent).toBe(false);
    expect(smsOwn.emailSent).toBe(false);
    expect(smsOwn.recovered).toBe(false);

    record({ idempotencyKey: "ch-d-email", customerId: "cust-d", channel: "email", action: "grant", scope: "marketing-email", consent: true });
    record({ idempotencyKey: "ch-d-sms", customerId: "cust-d", channel: "sms", action: "withdraw", scope: "marketing-sms" });
    const smsClosed = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-d-cart",
      customerId: "cust-d",
      cartCustomerId: "cust-d",
      cartId: "cart-d",
      channel: "sms",
    }));
    expect(consent.readMarketingConsent("cust-d").emailPermission).toBe("BLOCKED");
    expect(consent.readMarketingConsent("cust-d").smsPermission).toBe("WITHDRAWN");
    expect(smsClosed.code).toBe("CONSENT_WITHDRAWN");
    expect(smsClosed.smsSent).toBe(false);
    expect(smsClosed.emailSent).toBe(false);
    expect(smsClosed.pushSent).toBe(false);
    expect(smsClosed.recovered).toBe(false);
    expect(smsClosed.orderCreated).toBe(false);
    expect(smsClosed.paymentCreated).toBe(false);

    const unknownChannel = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-unknown",
      customerId: "cust-e",
      cartCustomerId: "cust-e",
      cartId: "cart-e",
      channel: "whatsapp",
    }));
    expect(unknownChannel.code).toBe("CHANNEL_UNKNOWN");
    expect(unknownChannel.status).toBe("UNKNOWN");
    expect(unknownChannel.channel).toBeNull();
    expect(unknownChannel.recovered).toBe(false);
    expect(unknownChannel.messageSent).toBe(false);
    expect(unknownChannel.emailSent).toBe(false);
    expect(unknownChannel.pushSent).toBe(false);

    const missingPush = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-missing-push",
      customerId: "cust-f",
      cartCustomerId: "cust-f",
      cartId: "cart-f",
      channel: "push",
    }));
    expect(consent.readMarketingConsent("cust-f").pushPermission).toBe("UNKNOWN");
    expect(missingPush.code).toBe("CONSENT_UNKNOWN");
    expect(missingPush.pushSent).toBe(false);
    expect(missingPush.recovered).toBe(false);
    expect(missingPush.messageSent).toBe(false);

    const conflict = record({
      idempotencyKey: "ch-conflict",
      customerId: "cust-g",
      channel: "push",
      action: "withdraw",
      scope: "marketing-push",
      consent: true,
    });
    expect(conflict.code).toBe("CONSENT_CONFLICT");
    expect(conflict.granted).toBe(false);
    const conflicted = recovery.assessCartRecovery(abandoned({
      idempotencyKey: "ch-conflict-cart",
      customerId: "cust-g",
      cartCustomerId: "cust-g",
      cartId: "cart-g",
      channel: "push",
      consent: true,
    }));
    expect(conflicted.code).toBe("CONSENT_REQUIRED");
    expect(conflicted.recovered).toBe(false);
    expect(conflicted.pushSent).toBe(false);
    expect(conflicted.emailSent).toBe(false);
    expect(conflicted.smsSent).toBe(false);
    expect(conflicted.messageSent).toBe(false);
    expect(conflicted.orderCreated).toBe(false);
    expect(conflicted.paymentCreated).toBe(false);
    expect(conflicted.couponAdded).toBe(false);
  });

  it("leaves consent, cart, and coupon checks commercially closed", () => {
    const grant = consent.decideMarketingConsent({
      idempotencyKey: "compat-consent",
      customerId: "cust-9",
      channel: "email",
      action: "grant",
      source: "account-settings",
      scope: "marketing-email",
      consentedAt: old,
      consent: true,
      verified: true,
    });
    expect(grant.granted).toBe(false);
    expect(grant.emailSent).toBe(false);

    const line = cart.planCart({
      idempotencyKey: "compat-cart",
      cartId: "cart-compat",
      customerId: "cust-9",
      productId: "prod-1",
      sku: "BZ-1",
      country: "DE",
      couponCountry: "DE",
      currency: "EUR",
      couponCurrency: "EUR",
      quantity: 1,
      price: 19,
      campaignId: "camp-1",
    });
    expect(line.total).toBeNull();
    expect(line.orderCreated).toBe(false);

    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();
  });
});
