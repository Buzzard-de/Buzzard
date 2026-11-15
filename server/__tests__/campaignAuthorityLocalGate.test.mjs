import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const authority = require("../lib/commerce/campaignAuthorityGate.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const coupon = require("../lib/commerce/couponGate.js");
const couponAuthority = require("../lib/commerce/couponAuthorityGate.js");
const recovery = require("../lib/commerce/cartRecoveryGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");

const future = "2099-01-01T00:00:00.000Z";
const later = "2100-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const started = "2020-06-01T00:00:00.000Z";

function campaign(extra = {}) {
  return {
    campaignId: "camp-1",
    sourceRecordId: "rec-1",
    authoritySource: "campaign-registry",
    ownerId: "owner-1",
    country: "DE",
    campaignCountry: "DE",
    currency: "EUR",
    campaignCurrency: "EUR",
    productId: "prod-1",
    campaignProductId: "prod-1",
    category: "sensors",
    campaignCategory: "sensors",
    startsAt: started,
    endsAt: future,
    discountRate: 10,
    verified: true,
    approved: true,
    authorized: true,
    active: true,
    ...extra,
  };
}

describe("campaign authority is not a discount", () => {
  it("keeps an unknown source or owner unknown and rejects a synthetic campaign", () => {
    const source = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "src-1",
      authoritySource: "",
      sourceRecordId: "",
      verified: true,
    }));
    expect(source.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(source.status).toBe("UNKNOWN");
    expect(source.authoritySource).toBeNull();
    expect(source.authorized).toBe(false);
    expect(source.discount).toBeNull();
    expect(source.commercialTotal).toBeNull();

    const owner = authority.decideCampaignAuthority(campaign({ idempotencyKey: "own-1", ownerId: "" }));
    expect(owner.code).toBe("CAMPAIGN_OWNER_UNKNOWN");
    expect(owner.status).toBe("UNKNOWN");
    expect(owner.ownerId).toBeNull();
    expect(owner.discount).toBeNull();

    const synthetic = authority.decideCampaignAuthority(campaign({ idempotencyKey: "mock-1", synthetic: true, active: true }));
    expect(synthetic.code).toBe("MOCK_NOT_CAMPAIGN");
    expect(synthetic.status).toBe("BLOCKED");
    expect(synthetic.authorized).toBe(false);
    expect(synthetic.active).toBe(false);
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.messageSent).toBe(false);
  });

  it("does not trust caller flags and does not price an otherwise complete campaign", () => {
    const row = authority.decideCampaignAuthority(campaign({ idempotencyKey: "full-1" }));
    expect(row.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(row.status).toBe("UNKNOWN");
    expect(row.callerFlagIgnored).toBe(true);
    expect(row.authorized).toBe(false);
    expect(row.verified).toBe(false);
    expect(row.approved).toBe(false);
    expect(row.active).toBe(false);
    expect(row.discount).toBeNull();
    expect(row.discountAmount).toBeNull();
    expect(row.total).toBeNull();
    expect(row.commercialTotal).toBeNull();
    expect(row.budget).toBeNull();
    expect(row.spend).toBeNull();
    expect(row.published).toBe(false);
    expect(row.orderCreated).toBe(false);
    expect(row.paymentCreated).toBe(false);
    expect(row.reservationCreated).toBe(false);
    expect(row.messageSent).toBe(false);
    expect(row.reasons).toContain("SALES_CLOSED");
    expect(row.productionReady).toBe(false);
    expect(row.selectedAuthority).toBeNull();
  });

  it("rejects a cancelled, unstarted, expired, or undated campaign", () => {
    const cancelled = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "cancel-1",
      campaignStatus: "cancelled",
      endsAt: past,
    }));
    expect(cancelled.code).toBe("CAMPAIGN_CANCELLED");
    expect(cancelled.status).toBe("BLOCKED");
    expect(cancelled.discount).toBeNull();

    const waiting = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "wait-1",
      startsAt: future,
      endsAt: later,
    }));
    expect(waiting.code).toBe("CAMPAIGN_NOT_STARTED");
    expect(waiting.commercialTotal).toBeNull();

    const expired = authority.decideCampaignAuthority(campaign({ idempotencyKey: "exp-1", endsAt: past }));
    expect(expired.code).toBe("CAMPAIGN_EXPIRED");
    expect(expired.discount).toBeNull();

    const undated = authority.decideCampaignAuthority(campaign({ idempotencyKey: "date-1", startsAt: "", endsAt: "" }));
    expect(undated.code).toBe("CAMPAIGN_WINDOW_UNKNOWN");
    expect(undated.status).toBe("UNKNOWN");
  });

  it("checks country, currency, product, and category scope separately", () => {
    const france = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "fr-1",
      country: "FR",
      campaignCountry: "DE",
    }));
    expect(france.code).toBe("COUNTRY_SCOPE_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.campaignCountry).toBe("DE");
    expect(france.currency).toBeNull();

    const blankCountry = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "country-1",
      country: "",
      campaignCountry: "",
    }));
    expect(blankCountry.code).toBe("COUNTRY_SCOPE_UNKNOWN");
    expect(blankCountry.status).toBe("UNKNOWN");

    const currency = authority.decideCampaignAuthority(campaign({ idempotencyKey: "fx-1", campaignCurrency: "PLN" }));
    expect(currency.code).toBe("CURRENCY_SCOPE_MISMATCH");
    expect(currency.currency).toBeNull();
    expect(currency.discount).toBeNull();

    const blankCurrency = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "fx-2",
      currency: "",
      campaignCurrency: "",
    }));
    expect(blankCurrency.code).toBe("CURRENCY_SCOPE_UNKNOWN");

    const product = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "sku-1",
      campaignProductId: "prod-2",
    }));
    expect(product.code).toBe("PRODUCT_SCOPE_MISMATCH");
    expect(product.productId).toBeNull();

    const blankProduct = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "sku-2",
      productId: "",
      campaignProductId: "",
    }));
    expect(blankProduct.code).toBe("PRODUCT_SCOPE_UNKNOWN");

    const category = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "cat-1",
      campaignCategory: "cables",
    }));
    expect(category.code).toBe("CATEGORY_SCOPE_MISMATCH");
    expect(category.category).toBeNull();

    const blankCategory = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "cat-2",
      category: "",
      campaignCategory: "",
    }));
    expect(blankCategory.code).toBe("CATEGORY_SCOPE_UNKNOWN");
    expect(blankCategory.commercialTotal).toBeNull();
  });

  it("blocks conflicting records, repeats, and failed retries", () => {
    const conflict = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "conflict-1",
      conflictingAuthority: "other-registry",
    }));
    expect(conflict.code).toBe("CAMPAIGN_AUTHORITY_CONFLICT");
    expect(conflict.status).toBe("BLOCKED");
    expect(conflict.selectedAuthority).toBeNull();
    expect(conflict.discount).toBeNull();
    expect(conflict.orderCreated).toBe(false);

    const otherRecord = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "conflict-2",
      sourceCampaignId: "camp-2",
    }));
    expect(otherRecord.code).toBe("CAMPAIGN_AUTHORITY_CONFLICT");

    const first = authority.decideCampaignAuthority(campaign({ idempotencyKey: "dup-1" }));
    const second = authority.decideCampaignAuthority(campaign({ idempotencyKey: "dup-1", authorized: true, discountRate: 25 }));
    expect(first.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_CAMPAIGN");
    expect(second.duplicate).toBe(true);
    expect(second.authorized).toBe(false);
    expect(second.discount).toBeNull();
    expect(second.paymentCreated).toBe(false);

    const failed = authority.decideCampaignAuthority(campaign({ idempotencyKey: "fail-1", timeout: true, authorized: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("UNKNOWN");
    expect(failed.attempts).toBe(1);
    expect(failed.discount).toBeNull();
    const retried = authority.retryCampaignAuthority("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("UNKNOWN");
    expect(retried.attempts).toBe(2);
    expect(retried.authorized).toBe(false);
    expect(retried.commercialTotal).toBeNull();
    expect(retried.messageSent).toBe(false);
    expect(retried.orderCreated).toBe(false);
    expect(authority.retryCampaignAuthority("missing-campaign").code).toBe("RETRY_UNKNOWN");
    expect(authority.retryCampaignAuthority("missing-campaign").status).toBe("UNKNOWN");
  });

  it("does not authorize an unverified owner, a fake id, or any channel consent", () => {
    const unverified = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-owner" }));
    expect(unverified.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(unverified.status).toBe("UNKNOWN");
    expect(unverified.authorized).toBe(false);
    expect(unverified.verified).toBe(false);
    expect(unverified.discount).toBeNull();
    expect(unverified.commercialTotal).toBeNull();
    expect(unverified.orderCreated).toBe(false);
    expect(unverified.paymentCreated).toBe(false);
    expect(unverified.published).toBe(false);
    expect(unverified.messageSent).toBe(false);

    const missingId = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-missing-id", campaignId: " " }));
    expect(missingId.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(missingId.campaignId).toBeNull();
    expect(missingId.authorized).toBe(false);
    expect(missingId.discount).toBeNull();
    expect(missingId.messageSent).toBe(false);

    const fakeId = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-fake-id", campaignId: "fake-camp" }));
    expect(fakeId.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(fakeId.authorized).toBe(false);
    expect(fakeId.published).toBe(false);
    expect(fakeId.paymentCreated).toBe(false);

    const unknownSource = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-source",
      authoritySource: "unknown",
    }));
    expect(unknownSource.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(unknownSource.status).toBe("UNKNOWN");
    expect(unknownSource.authoritySource).toBeNull();
    expect(unknownSource.authorized).toBe(false);
    expect(unknownSource.commercialTotal).toBeNull();

    const unknownOwner = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-owner-unknown", ownerId: "unknown" }));
    expect(unknownOwner.code).toBe("CAMPAIGN_OWNER_UNKNOWN");
    expect(unknownOwner.ownerId).toBeNull();
    expect(unknownOwner.authorized).toBe(false);

    const timedOut = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-timeout", timeout: true }));
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("UNKNOWN");
    expect(timedOut.authorized).toBe(false);
    expect(timedOut.discount).toBeNull();
    expect(timedOut.orderCreated).toBe(false);
    expect(timedOut.paymentCreated).toBe(false);
    expect(timedOut.published).toBe(false);
    expect(timedOut.messageSent).toBe(false);

    const expired = authority.decideCampaignAuthority(campaign({ idempotencyKey: "audit-expired", campaignStatus: "expired" }));
    expect(expired.code).toBe("CAMPAIGN_EXPIRED");
    expect(expired.status).toBe("BLOCKED");
    expect(expired.authorized).toBe(false);
    expect(expired.discount).toBeNull();
    expect(expired.messageSent).toBe(false);

    const ownerConflict = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-owner-conflict",
      recordOwnerId: "owner-2",
    }));
    expect(ownerConflict.code).toBe("CAMPAIGN_AUTHORITY_CONFLICT");
    expect(ownerConflict.status).toBe("BLOCKED");
    expect(ownerConflict.authorized).toBe(false);
    expect(ownerConflict.selectedAuthority).toBeNull();
    expect(ownerConflict.commercialTotal).toBeNull();
    expect(ownerConflict.orderCreated).toBe(false);

    const missingConsent = consent.readMarketingConsent("cust-campaign-missing");
    expect(missingConsent.granted).toBe(false);
    expect(missingConsent.consentVerified).toBe(false);
    expect(missingConsent.emailPermission).toBe("UNKNOWN");
    expect(missingConsent.smsPermission).toBe("UNKNOWN");
    expect(missingConsent.pushPermission).toBe("UNKNOWN");
    const noConsent = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-no-consent",
      customerId: "cust-campaign-missing",
      channel: "email",
      emailPermission: missingConsent.emailPermission,
      smsPermission: missingConsent.smsPermission,
      pushPermission: missingConsent.pushPermission,
      consentVerified: missingConsent.consentVerified,
    }));
    expect(noConsent.authorized).toBe(false);
    expect(noConsent.messageSent).toBe(false);
    expect(noConsent.published).toBe(false);
    expect(noConsent.emailSent).not.toBe(true);
    expect(noConsent.smsSent).not.toBe(true);
    expect(noConsent.pushSent).not.toBe(true);
    expect(noConsent.customerNotified).not.toBe(true);

    const emailOnly = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-email-consent",
      channel: "email",
      emailPermission: "GRANTED",
      consent: true,
      consentVerified: true,
    }));
    expect(emailOnly.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(emailOnly.authorized).toBe(false);
    expect(emailOnly.messageSent).toBe(false);
    expect(emailOnly.smsPermission).not.toBe("GRANTED");
    expect(emailOnly.pushPermission).not.toBe("GRANTED");
    expect(emailOnly.smsSent).not.toBe(true);
    expect(emailOnly.pushSent).not.toBe(true);
    expect(emailOnly.emailSent).not.toBe(true);

    const smsOnly = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-sms-consent",
      channel: "sms",
      smsPermission: "GRANTED",
      consent: true,
      consentVerified: true,
    }));
    expect(smsOnly.authorized).toBe(false);
    expect(smsOnly.messageSent).toBe(false);
    expect(smsOnly.emailPermission).not.toBe("GRANTED");
    expect(smsOnly.pushPermission).not.toBe("GRANTED");
    expect(smsOnly.emailSent).not.toBe(true);
    expect(smsOnly.pushSent).not.toBe(true);
    expect(smsOnly.smsSent).not.toBe(true);

    const pushOnly = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-push-consent",
      channel: "push",
      pushPermission: "GRANTED",
      consent: true,
      consentVerified: true,
    }));
    expect(pushOnly.authorized).toBe(false);
    expect(pushOnly.messageSent).toBe(false);
    expect(pushOnly.emailPermission).not.toBe("GRANTED");
    expect(pushOnly.smsPermission).not.toBe("GRANTED");
    expect(pushOnly.emailSent).not.toBe(true);
    expect(pushOnly.smsSent).not.toBe(true);
    expect(pushOnly.pushSent).not.toBe(true);
    expect(pushOnly.discount).toBeNull();
    expect(pushOnly.orderCreated).toBe(false);
    expect(pushOnly.paymentCreated).toBe(false);
    expect(pushOnly.published).toBe(false);
    expect(pushOnly.commercialTotal).toBeNull();

    const repeated = authority.decideCampaignAuthority(campaign({
      idempotencyKey: "audit-email-consent",
      channel: "sms",
      smsPermission: "GRANTED",
      authorized: true,
      discountRate: 40,
    }));
    expect(repeated.code).toBe("DUPLICATE_CAMPAIGN");
    expect(repeated.duplicate).toBe(true);
    expect(repeated.authorized).toBe(false);
    expect(repeated.discount).toBeNull();
    expect(repeated.messageSent).toBe(false);
    expect(repeated.paymentCreated).toBe(false);
    expect(repeated.published).toBe(false);
  });

  it("leaves coupon, coupon authority, and cart recovery commercially closed", () => {
    const planned = coupon.planCoupon({
      idempotencyKey: "compat-coupon",
      code: "SAVE10",
      customerId: "cust-1",
      productId: "prod-1",
      campaignId: "camp-1",
      sku: "BZ-1",
      country: "DE",
      couponCountry: "DE",
      currency: "EUR",
      couponCurrency: "EUR",
      startsAt: started,
      expiresAt: future,
      usageLimit: 10,
      usageCount: 1,
      customerLimit: 1,
      customerUses: 0,
      discountRate: 10,
      verified: true,
    });
    expect(planned.applied).toBe(false);
    expect(planned.discount).toBeNull();
    expect(planned.commercialTotal).toBeNull();
    expect(planned.orderCreated).toBe(false);

    const couponDecision = couponAuthority.decideCouponAuthority({
      authorityKey: "compat-authority",
      code: "SAVE10",
      campaignCode: "SAVE10",
      campaignId: "camp-1",
      couponCampaignId: "camp-1",
      customerId: "cust-1",
      productId: "prod-1",
      sku: "BZ-1",
      country: "DE",
      couponCountry: "DE",
      campaignCountry: "DE",
      currency: "EUR",
      couponCurrency: "EUR",
      campaignCurrency: "EUR",
      startsAt: started,
      expiresAt: future,
      usageLimit: 10,
      usageCount: 1,
      customerLimit: 1,
      customerUses: 0,
      discountRate: 10,
      authoritySource: "campaign-registry",
      ownerId: "owner-1",
      authorized: true,
    });
    expect(couponDecision.authorized).toBe(false);
    expect(couponDecision.discount).toBeNull();
    expect(couponDecision.paymentCreated).toBe(false);

    const cart = recovery.assessCartRecovery({
      idempotencyKey: "compat-recovery",
      customerId: "cust-1",
      cartCustomerId: "cust-1",
      cartId: "cart-compat",
      cartStatus: "abandoned",
      abandonedAt: past,
      channel: "email",
      price: 19,
      currency: "EUR",
      recovered: true,
      consent: true,
    });
    expect(cart.recovered).toBe(false);
    expect(cart.emailSent).toBe(false);
    expect(cart.orderCreated).toBe(false);
    expect(cart.price).toBeNull();

    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();
  });
});
