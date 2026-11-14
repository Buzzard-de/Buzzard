import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const loyalty = require("../lib/marketingLoyalty.js");
const customerStore = require("../lib/customerStore.js");
const crm = require("../lib/crmLoyalty.js");
const { cookieConsentRecord } = require("../lib/privacy/legalDisclosure.js");
const notificationEngine = require("../lib/notificationEngine.js");
const { db } = require("../lib/db");

const secretEmail = "preference-secret@example.test";

function counts() {
  return {
    preferences: db.prepare("SELECT COUNT(*) n FROM mktloy_marketing_preferences").get().n,
    campaigns: db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns").get().n,
    ledger: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n,
    accounts: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n,
    referrals: db.prepare("SELECT COUNT(*) n FROM mktloy_referrals").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
    recovery: db.prepare("SELECT COUNT(*) n FROM recovery_campaigns").get().n,
    abandoned: db.prepare("SELECT COUNT(*) n FROM abandoned_carts").get().n,
    offers: db.prepare("SELECT COUNT(*) n FROM offers").get().n,
  };
}

function silence(run) {
  const lines = [];
  const methods = ["log", "info", "warn", "error"];
  const previous = Object.fromEntries(methods.map((method) => [method, console[method]]));
  for (const method of methods) {
    console[method] = (...args) => lines.push(args.map(String).join(" "));
  }
  try {
    return { value: run(), lines };
  } finally {
    for (const method of methods) console[method] = previous[method];
  }
}

describe("marketing preference is not legal consent", () => {
  it("does not grant permission from consent flags or an unknown source", () => {
    const id = Date.now();
    const before = counts();
    const { value: granted, lines } = silence(() => loyalty.updatePreferences(id, {
      consent: true,
      approved: true,
      verified: true,
      emailOptIn: true,
      smsOptIn: true,
      whatsappOptIn: true,
      consentSource: "web-form",
      consentScope: "email",
      consentAt: "2026-11-12T18:40:00+01:00",
      email: secretEmail,
      phone: "+491234567890",
    }));
    expect(granted.ok).toBe(false);
    expect(granted.code).toBe("CONSENT_UNVERIFIED");
    expect(granted.marketingPermission).toBe("BLOCKED");
    expect(granted.granted).toBe(false);
    expect(granted.consentVerified).toBe(false);
    expect(granted.consentSource).toBe("UNKNOWN");
    expect(granted.consentScope).toBe("UNKNOWN");
    expect(granted.consentAt).toBeNull();
    expect(granted.stored).toBe(false);
    expect(granted.notificationSent).toBe(false);
    expect(granted.emailSent).toBe(false);
    expect(granted.smsSent).toBe(false);
    expect(granted.whatsappSent).toBe(false);
    expect(granted.campaignCreated).toBe(false);
    expect(JSON.stringify(granted)).not.toContain(secretEmail);
    expect(lines.join("\n")).not.toContain(secretEmail);
    expect(loyalty.getPreferences(id).marketingPermission).toBe("UNKNOWN");
    expect(counts()).toEqual(before);
  });

  it("records a withdrawal without a second row, a message, or a commercial record", async () => {
    const id = Date.now() + 11;
    const before = counts();
    const first = loyalty.updatePreferences(id, { email: secretEmail, withdraw: true, consent: true, approved: true });
    expect(first.withdrawn).toBe(true);
    expect(first.marketingPermission).toBe("WITHDRAWN");
    expect(first.granted).toBe(false);
    expect(first.notificationSent).toBe(false);
    expect(JSON.stringify(first)).not.toContain(secretEmail);
    const row = db.prepare("SELECT email_opt_in, sms_opt_in, push_opt_in FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id);
    expect(row).toEqual({ email_opt_in: 0, sms_opt_in: 0, push_opt_in: 0 });

    const second = loyalty.updatePreferences(id, { emailOptIn: false, smsOptIn: false, phone: "+491111" });
    expect(second.duplicate).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.withdrawn).toBe(true);
    expect(db.prepare("SELECT COUNT(*) n FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id).n).toBe(1);

    const [left, right] = await Promise.all([
      Promise.resolve().then(() => loyalty.updatePreferences(id, { unsubscribe: true, email: secretEmail })),
      Promise.resolve().then(() => loyalty.updatePreferences(id, { marketing: false, email: secretEmail })),
    ]);
    expect(left.withdrawn).toBe(true);
    expect(right.withdrawn).toBe(true);
    expect([left.duplicate, right.duplicate].filter(Boolean).length).toBe(2);
    expect(db.prepare("SELECT email_opt_in FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id).email_opt_in).toBe(0);
    expect(loyalty.getPreferences(id).marketingPermission).toBe("WITHDRAWN");
    expect(loyalty.getPreferences(id).granted).toBe(false);

    const laterGrant = loyalty.updatePreferences(id, { consent: true, verified: true, emailOptIn: true, email: secretEmail });
    expect(laterGrant.stored).toBe(false);
    expect(laterGrant.marketingPermission).toBe("BLOCKED");
    expect(db.prepare("SELECT email_opt_in FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id).email_opt_in).toBe(0);

    const after = counts();
    expect(after.preferences).toBe(before.preferences + 1);
    expect(after.campaigns).toBe(before.campaigns);
    expect(after.ledger).toBe(before.ledger);
    expect(after.accounts).toBe(before.accounts);
    expect(after.referrals).toBe(before.referrals);
    expect(after.coupons).toBe(before.coupons);
    expect(after.orders).toBe(before.orders);
  });

  it("does not copy a marketing grant into the customer profile, a cookie record, or a message", () => {
    const profile = customerStore.applyPreferencePatch({ language: "de" }, {
      language: "tr",
      marketing: true,
      consent: true,
      emailOptIn: true,
      email: secretEmail,
    });
    expect(profile.preferences.language).toBe("tr");
    expect(profile.preferences.marketing).toBeUndefined();
    expect(profile.preferences.emailOptIn).toBeUndefined();
    expect(profile.granted).toBe(false);
    expect(profile.marketingPermission).toBe("BLOCKED");
    expect(profile.notificationSent).toBe(false);
    expect(JSON.stringify(profile)).not.toContain(secretEmail);

    const withdrawn = customerStore.applyPreferencePatch(profile.preferences, { marketing: false, email: secretEmail });
    expect(withdrawn.withdrawn).toBe(true);
    expect(withdrawn.preferences.marketing).toBe(false);
    expect(withdrawn.notificationSent).toBe(false);

    const cookie = cookieConsentRecord({ marketing: true, analytics: false, actorId: secretEmail });
    expect(cookie.marketing).toBe(false);
    expect(cookie.marketingPermission).toBe("BLOCKED");
    expect(cookie.lawfulBasis.marketing).toBe("not_granted");
    expect(cookie.consentVerified).toBe(false);
    expect(JSON.stringify(cookie)).not.toContain(secretEmail);

    const before = counts();
    const message = notificationEngine.handleAutomationEvent({
      type: "abandoned_cart",
      payload: { email: secretEmail, marketingConsent: true, verified: true, approved: true },
    });
    expect(message.sent).toBe(false);
    expect(message.queued).toBe(false);
    expect(message.customerNotified).toBe(false);
    expect(message.reason).toBe("marketing_consent_required");
    expect(JSON.stringify(message)).not.toContain(secretEmail);

    const user = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `crm-${Date.now()}@example.test`,
      "x",
      "customer",
      "Crm"
    );
    const crmGrant = crm.upsertCrmProfile(user.lastInsertRowid, {
      marketingEmail: true,
      marketingSms: true,
      marketingWhatsapp: true,
      consent: true,
      phone: "+491234",
      email: secretEmail,
    });
    expect(crmGrant.granted).toBe(false);
    expect(crmGrant.marketingPermission).toBe("BLOCKED");
    expect(crmGrant.notificationSent).toBe(false);
    expect(JSON.stringify(crmGrant)).not.toContain(secretEmail);
    const crmRow = db.prepare("SELECT marketing_email, marketing_sms, marketing_whatsapp, phone FROM crm_profiles WHERE user_id = ?").get(user.lastInsertRowid);
    expect(crmRow.marketing_email).toBe(0);
    expect(crmRow.marketing_sms).toBe(0);
    expect(crmRow.marketing_whatsapp).toBe(0);
    expect(crmRow.phone).toBe("");

    const crmWithdraw = crm.upsertCrmProfile(user.lastInsertRowid, { marketingEmail: false, withdraw: true, phone: "+491234" });
    expect(crmWithdraw.marketingPermission).toBe("WITHDRAWN");
    expect(crmWithdraw.notificationSent).toBe(false);

    const earned = crm.earnPoints(user.lastInsertRowid, { points: 80, approved: true, email: secretEmail });
    expect(earned.ok).toBe(false);
    expect(earned.code).toBe("SALES_CLOSED");
    expect(earned.pointsApplied).toBe(false);
    const redeemed = crm.redeemReward(user.lastInsertRowid, 1);
    expect(redeemed.couponIssued).toBe(false);
    expect(redeemed.balanceChanged).toBe(false);
    const tracked = crm.trackAbandonedCart(user.lastInsertRowid, { subtotal: 40, email: secretEmail });
    expect(tracked.cartStored).toBe(false);
    expect(tracked.notified).toBe(false);
    const recovery = crm.queueRecoveryCampaigns("email");
    expect(recovery.queued).toBe(0);
    expect(recovery.customerNotified).toBe(false);
    const after = counts();
    expect(after.recovery).toBe(before.recovery);
    expect(after.abandoned).toBe(before.abandoned);
    expect(after.offers).toBe(before.offers);
    expect(after.coupons).toBe(before.coupons);
    expect(after.orders).toBe(before.orders);
  });
});
