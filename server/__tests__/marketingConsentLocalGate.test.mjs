import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const consent = require("../lib/commerce/marketingConsentGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");
const referrals = require("../lib/commerce/referralAuthorityGate.js");

const when = "2026-11-15T10:00:00.000Z";

function request(extra = {}) {
  return {
    customerId: "cust-1",
    channel: "email",
    action: "grant",
    source: "account-settings",
    scope: "marketing-email",
    consentedAt: when,
    consent: true,
    approved: true,
    verified: true,
    subscribed: true,
    ...extra,
  };
}

describe("marketing consent does not send a message", () => {
  it("keeps channels separate and rejects a default or unverified grant", () => {
    const email = consent.decideMarketingConsent(request({ idempotencyKey: "email-1" }));
    expect(email.code).toBe("CONSENT_UNVERIFIED");
    expect(email.status).toBe("BLOCKED");
    expect(email.granted).toBe(false);
    expect(email.consentVerified).toBe(false);
    expect(email.emailPermission).toBe("BLOCKED");
    expect(email.smsPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("UNKNOWN");
    expect(email.emailSent).toBe(false);
    expect(email.smsSent).toBe(false);
    expect(email.adSent).toBe(false);
    expect(email.callerFlagIgnored).toBe(true);
    expect(email.reasons).toContain("SALES_CLOSED");
    expect(email.productionReady).toBe(false);

    const sms = consent.decideMarketingConsent(request({
      idempotencyKey: "sms-1",
      customerId: "cust-1",
      channel: "sms",
      scope: "marketing-sms",
    }));
    expect(sms.smsPermission).toBe("BLOCKED");
    expect(sms.emailPermission).toBe("BLOCKED");
    expect(sms.messageSent).toBe(false);

    const prechecked = consent.decideMarketingConsent(request({
      idempotencyKey: "pre-1",
      customerId: "cust-2",
      channel: "push",
      prechecked: true,
      defaultChecked: true,
    }));
    expect(prechecked.code).toBe("DEFAULT_CONSENT_REJECTED");
    expect(prechecked.granted).toBe(false);
    expect(prechecked.pushPermission).toBe("BLOCKED");

    const missing = consent.decideMarketingConsent(request({
      idempotencyKey: "missing-1",
      customerId: "cust-3",
      source: "",
      scope: "",
      consentedAt: "",
    }));
    expect(missing.code).toBe("CONSENT_UNKNOWN");
    expect(missing.status).toBe("UNKNOWN");
    expect(missing.emailPermission).toBe("UNKNOWN");
  });

  it("withdraws one channel and keeps a conflicting or synthetic record closed", () => {
    const withdrawn = consent.decideMarketingConsent(request({
      idempotencyKey: "withdraw-email",
      customerId: "cust-4",
      channel: "email",
      action: "withdraw",
      consent: false,
      approved: false,
      verified: false,
      subscribed: false,
    }));
    expect(withdrawn.code).toBe("CONSENT_WITHDRAWN");
    expect(withdrawn.emailPermission).toBe("WITHDRAWN");
    expect(withdrawn.smsPermission).toBe("UNKNOWN");
    expect(withdrawn.emailSent).toBe(false);
    expect(withdrawn.contactAllowed).toBe(false);

    const reopen = consent.decideMarketingConsent(request({
      idempotencyKey: "reopen-email",
      customerId: "cust-4",
      channel: "email",
      action: "grant",
    }));
    expect(reopen.code).toBe("CONSENT_WITHDRAWN");
    expect(reopen.emailPermission).toBe("WITHDRAWN");
    expect(reopen.granted).toBe(false);

    const smsStill = consent.decideMarketingConsent(request({
      idempotencyKey: "sms-4",
      customerId: "cust-4",
      channel: "sms",
      action: "grant",
      scope: "marketing-sms",
    }));
    expect(smsStill.emailPermission).toBe("WITHDRAWN");
    expect(smsStill.smsPermission).toBe("BLOCKED");
    expect(smsStill.smsSent).toBe(false);

    const conflict = consent.decideMarketingConsent(request({
      idempotencyKey: "conflict-1",
      customerId: "cust-5",
      action: "withdraw",
      withdraw: true,
      consent: true,
    }));
    expect(conflict.code).toBe("CONSENT_CONFLICT");
    expect(conflict.status).toBe("BLOCKED");
    expect(conflict.granted).toBe(false);

    const synthetic = consent.decideMarketingConsent(request({
      idempotencyKey: "mock-1",
      customerId: "cust-6",
      synthetic: true,
      source: "mock",
    }));
    expect(synthetic.code).toBe("MOCK_NOT_CONSENT");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.granted).toBe(false);
    expect(synthetic.emailSent).toBe(false);
  });

  it("records history, blocks a repeat, and keeps a failed retry closed", () => {
    const first = consent.decideMarketingConsent(request({ idempotencyKey: "dup-1", customerId: "cust-7" }));
    const second = consent.decideMarketingConsent(request({ idempotencyKey: "dup-1", customerId: "cust-7", subscribed: true }));
    expect(first.granted).toBe(false);
    expect(second.code).toBe("DUPLICATE_CONSENT");
    expect(second.duplicate).toBe(true);
    expect(second.granted).toBe(false);
    expect(second.messageSent).toBe(false);

    const failed = consent.decideMarketingConsent(request({
      idempotencyKey: "fail-1",
      customerId: "cust-8",
      channel: "sms",
      timeout: true,
    }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.smsPermission).toBe("CLOSED");
    expect(failed.smsSent).toBe(false);
    const retried = consent.retryMarketingConsent("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.granted).toBe(false);
    expect(retried.smsPermission).toBe("CLOSED");
    expect(retried.emailSent).toBe(false);
    expect(retried.smsSent).toBe(false);
    expect(retried.adSent).toBe(false);
    expect(consent.retryMarketingConsent("missing-consent").code).toBe("RETRY_UNKNOWN");

    const history = consent.consentHistory("cust-4");
    expect(history.length).toBeGreaterThan(0);
    expect(history.some((entry) => entry.code === "CONSENT_WITHDRAWN" && entry.channel === "email" && entry.granted === false)).toBe(true);
    expect(JSON.stringify(history)).not.toContain("@");
  });

  it("does not turn one channel, a missing record, or a conflict into marketing authority", () => {
    const absent = consent.readMarketingConsent("cust-never");
    expect(absent.emailPermission).toBe("UNKNOWN");
    expect(absent.smsPermission).toBe("UNKNOWN");
    expect(absent.pushPermission).toBe("UNKNOWN");
    expect(absent.granted).toBe(false);
    expect(absent.consentVerified).toBe(false);
    expect(absent.messageSent).toBe(false);

    const noCustomer = consent.decideMarketingConsent(request({ idempotencyKey: "audit-nocust", customerId: "" }));
    expect(noCustomer.code).toBe("CUSTOMER_UNKNOWN");
    expect(noCustomer.status).toBe("UNKNOWN");
    expect(noCustomer.granted).toBe(false);
    expect(noCustomer.consentVerified).toBe(false);
    expect(noCustomer.messageSent).toBe(false);
    expect(noCustomer.emailSent).toBe(false);
    expect(noCustomer.smsSent).toBe(false);
    expect(noCustomer.contactAllowed).toBe(false);

    const unsupported = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-wa",
      customerId: "cust-audit-wa",
      channel: "whatsapp",
    }));
    expect(unsupported.code).toBe("CHANNEL_UNKNOWN");
    expect(unsupported.channel).toBeNull();
    expect(unsupported.granted).toBe(false);
    expect(unsupported.emailPermission).toBe("UNKNOWN");
    expect(unsupported.smsPermission).toBe("UNKNOWN");
    expect(unsupported.pushPermission).toBe("UNKNOWN");
    expect(unsupported.messageSent).toBe(false);

    const emailOnly = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-email",
      customerId: "cust-audit-email",
    }));
    expect(emailOnly.code).toBe("CONSENT_UNVERIFIED");
    expect(emailOnly.granted).toBe(false);
    expect(emailOnly.emailPermission).toBe("BLOCKED");
    expect(emailOnly.smsPermission).toBe("UNKNOWN");
    expect(emailOnly.pushPermission).toBe("UNKNOWN");
    expect(emailOnly.smsSent).toBe(false);
    expect(emailOnly.contactAllowed).toBe(false);

    const smsOnly = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-sms",
      customerId: "cust-audit-sms",
      channel: "sms",
      scope: "marketing-sms",
    }));
    expect(smsOnly.granted).toBe(false);
    expect(smsOnly.smsPermission).toBe("BLOCKED");
    expect(smsOnly.pushPermission).toBe("UNKNOWN");
    expect(smsOnly.emailPermission).toBe("UNKNOWN");
    expect(smsOnly.smsSent).toBe(false);
    expect(smsOnly.messageSent).toBe(false);

    const pushOnly = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-push",
      customerId: "cust-audit-push",
      channel: "push",
      scope: "marketing-push",
    }));
    expect(pushOnly.granted).toBe(false);
    expect(pushOnly.pushPermission).toBe("BLOCKED");
    expect(pushOnly.emailPermission).toBe("UNKNOWN");
    expect(pushOnly.smsPermission).toBe("UNKNOWN");
    expect(pushOnly.emailSent).toBe(false);
    expect(pushOnly.messageSent).toBe(false);

    const conflict = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-conflict",
      customerId: "cust-audit-conflict",
      action: "withdraw",
      consent: true,
    }));
    expect(conflict.code).toBe("CONSENT_CONFLICT");
    expect(conflict.status).toBe("BLOCKED");
    expect(conflict.granted).toBe(false);
    expect(conflict.emailPermission).toBe("BLOCKED");
    expect(conflict.smsPermission).toBe("UNKNOWN");
    expect(conflict.pushPermission).toBe("UNKNOWN");
    expect(conflict.messageSent).toBe(false);
    expect(conflict.contactAllowed).toBe(false);

    const timedOut = consent.decideMarketingConsent(request({
      idempotencyKey: "audit-timeout",
      customerId: "cust-audit-timeout",
      channel: "push",
      timeout: true,
    }));
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");
    expect(timedOut.granted).toBe(false);
    expect(timedOut.pushPermission).toBe("CLOSED");
    expect(timedOut.emailPermission).toBe("UNKNOWN");
    expect(timedOut.smsPermission).toBe("UNKNOWN");
    expect(timedOut.messageSent).toBe(false);
    expect(timedOut.emailSent).toBe(false);
    expect(timedOut.smsSent).toBe(false);
  });

  it("leaves coupon arithmetic and referral rewards commercially closed", () => {
    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.ok).toBe(false);
    expect(arithmetic.discount).toBeNull();
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();
    expect(arithmetic.orderCreated).toBe(false);
    expect(arithmetic.paymentCreated).toBe(false);

    const referral = referrals.assessReferral({
      idempotencyKey: "consent-referral",
      referrerId: "cust-a",
      referredId: "cust-b",
      code: "REF-SAVE",
      country: "DE",
      campaignCountry: "DE",
      currency: "EUR",
      campaignCurrency: "EUR",
      startsAt: "2020-06-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      rewardAmount: 10,
      authoritySource: "campaign-registry",
      verified: true,
      completed: true,
    });
    expect(referral.code).toBe("REWARD_UNVERIFIED");
    expect(referral.rewardAmount).toBeNull();
    expect(referral.paymentCreated).toBe(false);
  });
});
