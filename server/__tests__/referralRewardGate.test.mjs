import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const loyalty = require("../lib/marketingLoyalty.js");
const { db } = require("../lib/db");

function counts() {
  return {
    referrals: db.prepare("SELECT COUNT(*) n FROM mktloy_referrals").get().n,
    completed: db.prepare("SELECT COUNT(*) n FROM mktloy_referrals WHERE status = 'completed'").get().n,
    ledger: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n,
    accounts: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
  };
}

describe("completeReferral does not grant a commercial reward", () => {
  it("does not complete a pending referral or write points when the caller says it is paid", () => {
    const code = `REF-${Date.now()}`;
    const referrer = Date.now();
    db.prepare(
      "INSERT INTO mktloy_referrals(referrer_customer_id, code, status, reward_points) VALUES(?,?, 'pending', ?)"
    ).run(referrer, code, 40);
    const before = counts();
    const balanceBefore = db.prepare("SELECT points_balance FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(referrer);

    const first = loyalty.completeReferral({
      code,
      completed: true,
      paid: true,
      verified: true,
      approved: true,
      successful: true,
      live: true,
      referredCustomerId: referrer + 1,
    });
    expect(first.ok).toBe(false);
    expect(first.code).toBe("REFERRER_UNKNOWN");
    expect(first.referralStatus).toBe("UNKNOWN");
    expect(first.earned).toBe(false);
    expect(first.completed).toBe(false);
    expect(first.rewardPoints).toBeNull();
    expect(first.arithmeticOnly).toBe(false);
    expect(first.arithmeticReward).toBeNull();
    expect(first.balance).toBeNull();
    expect(first.ledgerWritten).toBe(false);
    expect(first.couponIssued).toBe(false);
    expect(first.discountApplied).toBe(false);
    expect(first.callerFlagIgnored).toBe(true);
    expect(first.reasons).toEqual(expect.arrayContaining(["SALES_CLOSED", "REFERRER_UNKNOWN"]));

    const second = loyalty.completeReferral({ code, completed: true, paid: true });
    expect(second.duplicate).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.rewardPoints).toBeNull();
    expect(second.ledgerWritten).toBe(false);

    const row = db.prepare("SELECT status, completed_at, referred_customer_id FROM mktloy_referrals WHERE code = ?").get(code);
    expect(row.status).toBe("pending");
    expect(row.completed_at).toBeNull();
    expect(row.referred_customer_id).toBeNull();
    const after = counts();
    expect(after.completed).toBe(before.completed);
    expect(after.ledger).toBe(before.ledger);
    expect(after.accounts).toBe(before.accounts);
    expect(after.coupons).toBe(before.coupons);
    expect(after.orders).toBe(before.orders);
    expect(db.prepare("SELECT points_balance FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(referrer)?.points_balance ?? null).toBe(
      balanceBefore?.points_balance ?? null
    );
  });

  it("does not grant a second reward when two completions run together", async () => {
    const code = `REF-RACE-${Date.now()}`;
    const referrer = Date.now() + 3;
    db.prepare(
      "INSERT INTO mktloy_referrals(referrer_customer_id, code, status, reward_points) VALUES(?,?, 'pending', ?)"
    ).run(referrer, code, 15);
    const before = counts();
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => loyalty.completeReferral({ code, verified: true, live: true })),
      Promise.resolve().then(() => loyalty.completeReferral({ code, paid: true, successful: true })),
    ]);
    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    expect(left.ledgerWritten).toBe(false);
    expect(right.ledgerWritten).toBe(false);
    expect([left.duplicate, right.duplicate].filter(Boolean).length).toBe(1);
    expect(db.prepare("SELECT status FROM mktloy_referrals WHERE code = ?").get(code).status).toBe("pending");
    expect(counts().ledger).toBe(before.ledger);
    expect(counts().accounts).toBe(before.accounts);
  });

  it("does not reverse an unearned reward into a negative balance or a coupon", () => {
    const code = `REF-CANCEL-${Date.now()}`;
    const referrer = Date.now() + 7;
    db.prepare(
      "INSERT INTO mktloy_loyalty_accounts(customer_id, points_balance, lifetime_points) VALUES(?,?,?)"
    ).run(referrer, 8, 8);
    db.prepare(
      "INSERT INTO mktloy_referrals(referrer_customer_id, code, status, reward_points) VALUES(?,?, 'pending', ?)"
    ).run(referrer, code, 25);
    const before = counts();
    const cancelled = loyalty.cancelReferral({
      code,
      completed: true,
      paid: true,
      points: -100,
      rewardPoints: -100,
      verified: true,
    });
    expect(cancelled.ok).toBe(false);
    expect(cancelled.code).toBe("SALES_CLOSED");
    expect(cancelled.reversed).toBe(false);
    expect(cancelled.rewardReversed).toBe(false);
    expect(cancelled.balanceChanged).toBe(false);
    expect(cancelled.negativeBalance).toBe(false);
    expect(cancelled.rewardPoints).toBeNull();
    expect(db.prepare("SELECT points_balance FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(referrer).points_balance).toBe(8);
    expect(db.prepare("SELECT status FROM mktloy_referrals WHERE code = ?").get(code).status).toBe("pending");
    expect(counts().ledger).toBe(before.ledger);
    expect(counts().coupons).toBe(before.coupons);

    const created = loyalty.createReferral({
      referrerCustomerId: referrer,
      rewardPoints: 999,
      paid: true,
      verified: true,
      live: true,
    });
    expect(created.ok).toBe(false);
    expect(created.created).toBe(false);
    expect(created.rewardPoints).toBeNull();
    expect(created.code).toBe("REFERRED_UNKNOWN");
    expect(counts().referrals).toBe(before.referrals);

    const campaignsBefore = db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns").get().n;
    const campaign = loyalty.createCampaign({
      code: `CAMP-${Date.now()}`,
      name: "Referral save",
      type: "coupon",
      status: "active",
      discountValue: 15,
      verified: true,
      live: true,
    });
    expect(campaign.ok).toBe(false);
    expect(campaign.created).toBe(false);
    expect(campaign.discount).toBeNull();
    expect(campaign.code).toBe("SALES_CLOSED");
    expect(db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns").get().n).toBe(campaignsBefore);
    const updated = loyalty.updateCampaign(1, { status: "active", discountValue: 20, approved: true });
    expect(updated.ok).toBe(false);
    expect(updated.stored).toBe(false);
    expect(updated.discount).toBeNull();

    const account = loyalty.createLoyaltyAccount({ customerId: `loyal-${Date.now()}`, approved: true, live: true });
    expect(account.ok).toBe(false);
    expect(account.accountCreated).toBe(false);
    expect(account.code).toBe("SALES_CLOSED");
    expect(counts().accounts).toBe(before.accounts);
  });
});

describe("FIN-M24 referral authority stays closed", () => {
  function referral(extra = {}) {
    return {
      referrerId: "cust-m24-a",
      referredId: "cust-m24-b",
      code: "REF-SAVE",
      country: "DE",
      campaignCountry: "DE",
      currency: "EUR",
      campaignCurrency: "EUR",
      rewardAmount: 10,
      authoritySource: "referral-registry",
      ok: true,
      authorized: true,
      status: 200,
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.created).toBe(false);
    expect(result.earned).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.rewardCreated).toBe(false);
    expect(result.rewardPoints).toBeNull();
    expect(result.rewardAmount).toBeNull();
    expect(result.balance).toBeNull();
    expect(result.balanceChanged).toBe(false);
    expect(result.ledgerWritten).toBe(false);
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.transferCreated).toBe(false);
    expect(result.commercial).toBe(false);
    expect(result.status).not.toBe(200);
    expect(result.callerAuthorizedIgnored).toBe(true);
  }

  it("blocks a self referral and an unknown referrer or referred customer", () => {
    const self = loyalty.createReferral(referral({
      idempotencyKey: "m24-self",
      referredId: "cust-m24-a",
    }));
    expectClosed(self);
    expect(self.code).toBe("SELF_REFERRAL");
    expect(self.status).toBe("BLOCKED");

    const referrer = loyalty.completeReferral(referral({
      idempotencyKey: "m24-referrer",
      referrerId: "",
      referredId: "cust-m24-referrer",
    }));
    expectClosed(referrer);
    expect(referrer.code).toBe("REFERRER_UNKNOWN");
    expect(referrer.status).toBe("UNKNOWN");

    const referred = loyalty.createReferral(referral({
      idempotencyKey: "m24-referred",
      referredId: "",
      referrerId: "cust-m24-referred-owner",
    }));
    expectClosed(referred);
    expect(referred.code).toBe("REFERRED_UNKNOWN");
    expect(referred.status).toBe("UNKNOWN");
  });

  it("does not authorize an unknown source, an unknown country, or an unverified reward", () => {
    const source = loyalty.createReferral(referral({
      idempotencyKey: "m24-source",
      referredId: "cust-m24-source",
      authoritySource: "",
    }));
    expectClosed(source);
    expect(source.code).toBe("REFERRAL_CODE_UNKNOWN");
    expect(source.status).toBe("UNKNOWN");

    const country = loyalty.completeReferral(referral({
      idempotencyKey: "m24-country",
      referredId: "cust-m24-country",
      country: "",
      campaignCountry: "",
    }));
    expectClosed(country);
    expect(country.code).toBe("COUNTRY_SCOPE_UNKNOWN");
    expect(country.status).toBe("BLOCKED");

    const reward = loyalty.completeReferral(referral({
      idempotencyKey: "m24-reward",
      referredId: "cust-m24-reward",
    }));
    expectClosed(reward);
    expect(reward.code).toBe("REWARD_UNVERIFIED");
    expect(reward.status).toBe("UNKNOWN");
    expect(reward.ledgerWritten).toBe(false);
  });

  it("keeps timeout, network failure, caller flags, and a repeated invite from creating a reward", () => {
    const timedOut = loyalty.createReferral(referral({
      idempotencyKey: "m24-timeout",
      referredId: "cust-m24-timeout",
      timeout: true,
    }));
    expectClosed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");

    const failed = loyalty.completeReferral(referral({
      idempotencyKey: "m24-network",
      referredId: "cust-m24-network",
      networkError: true,
    }));
    expectClosed(failed);
    expect(failed.code).toBe("NETWORK_ERROR");
    expect(failed.status).toBe("FAILED");

    const first = loyalty.createReferral(referral({
      idempotencyKey: "m24-repeat",
      referredId: "cust-m24-repeat",
    }));
    const second = loyalty.completeReferral(referral({
      idempotencyKey: "m24-repeat",
      referredId: "cust-m24-repeat",
      authorized: true,
      status: 200,
    }));
    expectClosed(first);
    expectClosed(second);
    expect(first.code).toBe("REWARD_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_REWARD");
    expect(second.duplicate).toBe(true);
    expect(second.rewardCreated).toBe(false);
    expect(second.ledgerWritten).toBe(false);

    const again = loyalty.completeReferral(referral({
      idempotencyKey: "m24-repeat-next",
      referredId: "cust-m24-repeat",
    }));
    expectClosed(again);
    expect(again.code).toBe("DUPLICATE_REFERRAL");
    expect(again.rewardCreated).toBe(false);
    expect(again.paymentCreated).toBe(false);
  });
});
