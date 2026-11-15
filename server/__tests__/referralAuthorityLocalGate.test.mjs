import { beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const referrals = require("../lib/commerce/referralAuthorityGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");
const entries = require("../lib/commerce/couponEntryGate.js");

const future = "2099-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const started = "2020-06-01T00:00:00.000Z";
const later = "2099-06-01T00:00:00.000Z";

function referral(extra = {}) {
  return {
    referrerId: "cust-a",
    referredId: "cust-b",
    code: "REF-SAVE",
    campaignId: "camp-1",
    country: "DE",
    campaignCountry: "DE",
    currency: "EUR",
    campaignCurrency: "EUR",
    startsAt: started,
    expiresAt: future,
    rewardAmount: 10,
    authoritySource: "campaign-registry",
    ownerId: "owner-1",
    verified: true,
    approved: true,
    eligible: true,
    completed: true,
    ...extra,
  };
}

describe("a referral is not a reward", () => {
  beforeEach(() => {
    referrals.resetReferralMemory();
  });

  it("rejects a missing identity, a self referral, and a bad code", () => {
    const noReferrer = referrals.assessReferral(referral({ idempotencyKey: "ref-1", referrerId: "" }));
    expect(noReferrer.code).toBe("REFERRER_UNKNOWN");
    expect(noReferrer.status).toBe("UNKNOWN");
    expect(noReferrer.rewardAmount).toBeNull();
    expect(noReferrer.paymentCreated).toBe(false);

    const noReferred = referrals.assessReferral(referral({ idempotencyKey: "referred-1", referredId: "" }));
    expect(noReferred.code).toBe("REFERRED_UNKNOWN");
    expect(noReferred.earned).toBe(false);

    const self = referrals.assessReferral(referral({ idempotencyKey: "self-1", referredId: "cust-a" }));
    expect(self.code).toBe("SELF_REFERRAL");
    expect(self.rewardCreated).toBe(false);
    expect(self.balanceChanged).toBe(false);

    const bad = referrals.assessReferral(referral({ idempotencyKey: "bad-1", referredId: "cust-c", code: "bad code" }));
    expect(bad.code).toBe("REFERRAL_CODE_INVALID");
    expect(bad.normalizedCode).toBeNull();
    expect(bad.rewardAmount).toBeNull();
  });

  it("does not invent a reward and blocks a closed, foreign, or conflicting campaign", () => {
    const unknownReward = referrals.assessReferral(referral({ idempotencyKey: "amt-1", referredId: "cust-d", rewardAmount: undefined }));
    expect(unknownReward.code).toBe("REWARD_UNKNOWN");
    expect(unknownReward.status).toBe("UNKNOWN");
    expect(unknownReward.rewardAmount).toBeNull();
    expect(unknownReward.rewardPoints).toBeNull();

    const unknownCode = referrals.assessReferral(referral({ idempotencyKey: "code-1", referredId: "cust-e", code: "NOTREAL", authoritySource: "" }));
    expect(unknownCode.code).toBe("REFERRAL_CODE_UNKNOWN");
    expect(unknownCode.authorized).toBe(false);

    const expired = referrals.assessReferral(referral({ idempotencyKey: "exp-1", referredId: "cust-f", expiresAt: past }));
    expect(expired.code).toBe("CAMPAIGN_EXPIRED");
    const waiting = referrals.assessReferral(referral({ idempotencyKey: "wait-1", referredId: "cust-g", startsAt: later }));
    expect(waiting.code).toBe("CAMPAIGN_NOT_STARTED");
    const cancelled = referrals.assessReferral(referral({ idempotencyKey: "cancel-1", referredId: "cust-h", campaignStatus: "cancelled" }));
    expect(cancelled.code).toBe("CAMPAIGN_CANCELLED");

    const currency = referrals.assessReferral(referral({ idempotencyKey: "fx-1", referredId: "cust-i", campaignCurrency: "PLN" }));
    expect(currency.code).toBe("CURRENCY_SCOPE_MISMATCH");
    expect(currency.currency).toBeNull();
    const france = referrals.assessReferral(referral({ idempotencyKey: "fr-1", referredId: "cust-j", country: "FR", campaignCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_SCOPE_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.campaignCountry).toBe("DE");

    const conflict = referrals.assessReferral(referral({ idempotencyKey: "conflict-1", referredId: "cust-k", conflictingReward: 25 }));
    expect(conflict.code).toBe("REFERRAL_CONFLICT");
    expect(conflict.selectedReward).toBeNull();
    expect(conflict.rewardAmount).toBeNull();
    expect(conflict.transferCreated).toBe(false);
  });

  it("blocks a repeated invite, a synthetic reward, and a failed retry", () => {
    const first = referrals.assessReferral(referral({ idempotencyKey: "ok-1", referredId: "cust-m", country: "GR", campaignCountry: "EL" }));
    expect(first.country).toBe("EL");
    expect(first.code).toBe("REWARD_UNVERIFIED");
    expect(first.callerFlagIgnored).toBe(true);
    expect(first.earned).toBe(false);
    expect(first.completed).toBe(false);
    expect(first.rewardCreated).toBe(false);
    expect(first.rewardAmount).toBeNull();
    expect(first.balance).toBeNull();
    expect(first.orderCreated).toBe(false);
    expect(first.paymentCreated).toBe(false);
    expect(first.reasons).toContain("SALES_CLOSED");
    expect(first.productionReady).toBe(false);

    const repeat = referrals.assessReferral(referral({ idempotencyKey: "ok-2", referredId: "cust-m" }));
    expect(repeat.code).toBe("DUPLICATE_REFERRAL");
    expect(repeat.duplicate).toBe(false);
    expect(repeat.rewardCreated).toBe(false);

    const again = referrals.assessReferral(referral({ idempotencyKey: "ok-1", referredId: "cust-m" }));
    expect(again.code).toBe("DUPLICATE_REWARD");
    expect(again.duplicate).toBe(true);
    expect(again.paymentCreated).toBe(false);

    const synthetic = referrals.assessReferral(referral({ idempotencyKey: "mock-1", referredId: "cust-n", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_REWARD");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.rewardAmount).toBeNull();

    const failed = referrals.assessReferral(referral({ idempotencyKey: "fail-1", referredId: "cust-o", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    const retried = referrals.retryReferral("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.rewardAmount).toBeNull();
    expect(retried.balanceChanged).toBe(false);
    expect(retried.transferCreated).toBe(false);
    expect(retried.orderCreated).toBe(false);
    expect(retried.paymentCreated).toBe(false);
    expect(referrals.retryReferral("missing-referral").code).toBe("RETRY_UNKNOWN");
  });

  it("does not keep a failed, synthetic, or invalid invite", () => {
    const timedOut = referrals.assessReferral(referral({ idempotencyKey: "mem-timeout", referredId: "cust-mem", timeout: true }));
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");
    const afterTimeout = referrals.assessReferral(referral({ idempotencyKey: "mem-timeout-next", referredId: "cust-mem" }));
    expect(afterTimeout.code).toBe("REWARD_UNVERIFIED");
    expect(afterTimeout.rewardAmount).toBeNull();
    expect(afterTimeout.paymentCreated).toBe(false);
    expect(afterTimeout.transferCreated).toBe(false);

    const synthetic = referrals.assessReferral(referral({ idempotencyKey: "mem-mock", referredId: "cust-mock", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_REWARD");
    const afterSynthetic = referrals.assessReferral(referral({ idempotencyKey: "mem-mock-next", referredId: "cust-mock" }));
    expect(afterSynthetic.code).toBe("REWARD_UNVERIFIED");
    expect(afterSynthetic.rewardAmount).toBeNull();
    expect(afterSynthetic.paymentCreated).toBe(false);
    expect(afterSynthetic.transferCreated).toBe(false);

    const invalid = referrals.assessReferral(referral({ idempotencyKey: "mem-bad", referredId: "cust-bad", code: "bad code" }));
    expect(invalid.code).toBe("REFERRAL_CODE_INVALID");
    const afterInvalid = referrals.assessReferral(referral({ idempotencyKey: "mem-bad-next", referredId: "cust-bad", code: "REF-SAVE" }));
    expect(afterInvalid.code).toBe("REWARD_UNVERIFIED");
    expect(afterInvalid.rewardAmount).toBeNull();
    expect(afterInvalid.paymentCreated).toBe(false);
    expect(afterInvalid.transferCreated).toBe(false);
  });

  it("keeps duplicate protection for an accepted invite and drops it after reset", () => {
    const accepted = referrals.assessReferral(referral({ idempotencyKey: "mem-ok", referredId: "cust-m" }));
    expect(accepted.code).toBe("REWARD_UNVERIFIED");
    expect(accepted.rewardAmount).toBeNull();
    expect(accepted.paymentCreated).toBe(false);
    expect(accepted.transferCreated).toBe(false);
    const repeat = referrals.assessReferral(referral({ idempotencyKey: "mem-ok-2", referredId: "cust-m" }));
    expect(repeat.code).toBe("DUPLICATE_REFERRAL");
    expect(repeat.rewardCreated).toBe(false);
    expect(repeat.paymentCreated).toBe(false);

    referrals.resetReferralMemory();
    const fresh = referrals.assessReferral(referral({ idempotencyKey: "mem-ok-fresh", referredId: "cust-m" }));
    expect(fresh.code).toBe("REWARD_UNVERIFIED");
    expect(fresh.rewardAmount).toBeNull();
    expect(fresh.paymentCreated).toBe(false);
    expect(fresh.transferCreated).toBe(false);
  });

  it("leaves coupon arithmetic and coupon entry commercially blocked", () => {
    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.ok).toBe(true);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();

    const entered = entries.submitCouponEntry({
      idempotencyKey: "referral-coupon",
      code: "WELCOME10",
      campaignCode: "WELCOME10",
      customerId: "cust-1",
      productId: "prod-1",
      sku: "BZ-CPN-1",
      productSku: "BZ-CPN-1",
      campaignId: "camp-1",
      couponCampaignId: "camp-1",
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
    });
    expect(entered.discount).toBeNull();
    expect(entered.commercialTotal).toBeNull();
    expect(entered.paymentCreated).toBe(false);
  });
});
