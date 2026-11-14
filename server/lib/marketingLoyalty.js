const { db } = require("./db");
const { isSalesEnabled } = require("./salesMode");

function isEnabled() {
  return process.env.BUZZARD_MARKETING_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function seedTiers() {
  if (db.prepare("SELECT id FROM mktloy_loyalty_tiers LIMIT 1").get()) return;

  const insert = db.prepare(`
    INSERT INTO mktloy_loyalty_tiers(code, name, min_points, multiplier, benefits_json)
    VALUES(?,?,?,?,?)
  `);
  insert.run("BRONZE", "Bronze", 0, 1, '{"shipping":"standard"}');
  insert.run("SILVER", "Silver", 1000, 1.1, '{"discount":5}');
  insert.run("GOLD", "Gold", 5000, 1.25, '{"discount":10,"priority_support":true}');
  insert.run("PLATINUM", "Platinum", 15000, 1.5, '{"discount":15,"priority_support":true,"early_access":true}');
}

function refreshTier(customerId) {
  const account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) return;

  const tier = db
    .prepare("SELECT * FROM mktloy_loyalty_tiers WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1")
    .get(account.lifetime_points);
  if (tier && tier.id !== account.tier_id) {
    db.prepare(`
      UPDATE mktloy_loyalty_accounts
      SET tier_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = ?
    `).run(tier.id, customerId);
  }
}

function createCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, created: false, stored: false, discount: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, created: false, stored: false, discount: null, callerFlagIgnored: true };
}

function listCampaigns() {
  return db.prepare("SELECT * FROM mktloy_campaigns ORDER BY id DESC").all();
}

function updateCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, discount: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, stored: false, discount: null, callerFlagIgnored: true };
}

function applyCampaign(code, body = {}) {
  const normalized = String(code || "").trim();
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (!normalized) reasons.push("UNKNOWN");
  else reasons.push("COUPON_UNVERIFIED");
  if (body.mock === true || body.demo === true || body.source === "mock" || /MOCK|DEMO|TEST|FAKE/i.test(normalized)) {
    reasons.push("MOCK_COUPON");
  }
  return {
    ok: false,
    valid: false,
    error: reasons[0] || "COUPON_UNVERIFIED",
    code: reasons[0] || "COUPON_UNVERIFIED",
    status: reasons[0] === "SALES_CLOSED" ? 403 : 409,
    arithmeticOnly: false,
    discount: null,
    finalTotal: null,
    discountedSubtotal: null,
    taxBase: null,
    commercialTotal: null,
    couponStatus: normalized ? "BLOCKED" : "UNKNOWN",
    commercialApplied: false,
    applied: false,
    callerFlagIgnored: true,
    orderCreated: false,
    reasons,
  };
}

function useCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, used: false, orderCreated: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, stored: false, used: false, orderCreated: false, callerFlagIgnored: true };
}

function createLoyaltyAccount() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, accountCreated: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, accountCreated: false, callerFlagIgnored: true };
}

function adjustPoints() {
  if (!isSalesEnabled()) {
    return {
      ok: false,
      error: "SALES_CLOSED",
      code: "SALES_CLOSED",
      status: 403,
      stored: false,
      pointsApplied: false,
      balance: null,
      callerFlagIgnored: true,
    };
  }
  return {
    ok: false,
    error: "ORDER_UNVERIFIED",
    code: "ORDER_UNVERIFIED",
    status: 409,
    stored: false,
    pointsApplied: false,
    balance: null,
    callerFlagIgnored: true,
  };
}

function getLoyaltyProfile(customerId) {
  const account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) return { error: "Loyalty account not found", status: 404 };

  return {
    account,
    tier: db.prepare("SELECT * FROM mktloy_loyalty_tiers WHERE id = ?").get(account.tier_id),
    ledger: db
      .prepare("SELECT * FROM mktloy_loyalty_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 100")
      .all(customerId),
  };
}

const referralCompletionAttempts = new Set();

function referralRefusal(body = {}, referral = null, duplicate = false) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("PAYMENT_UNVERIFIED");
  reasons.push("REFERRAL_UNVERIFIED");
  const code = String(body.code || "").trim();
  if (!code) reasons.push("UNKNOWN");
  if (body.mock === true || body.demo === true || body.source === "mock" || body.source === "DEMO") {
    reasons.push("MOCK_REFERRAL");
  }
  const arithmeticReward = referral && Number.isFinite(Number(referral.reward_points)) ? Number(referral.reward_points) : null;
  return {
    ok: false,
    error: reasons[0] || "SALES_CLOSED",
    code: reasons[0] || "SALES_CLOSED",
    status: reasons[0] === "SALES_CLOSED" ? 403 : 409,
    referralStatus: code ? "BLOCKED" : "UNKNOWN",
    earned: false,
    completed: false,
    cancelled: false,
    reversed: false,
    rewardReversed: false,
    rewardPoints: null,
    arithmeticReward,
    arithmeticOnly: arithmeticReward != null,
    balance: null,
    balanceChanged: false,
    negativeBalance: false,
    ledgerWritten: false,
    accountCreated: false,
    couponIssued: false,
    discountApplied: false,
    orderCreated: false,
    paymentCreated: false,
    callerFlagIgnored: true,
    idempotent: true,
    duplicate: Boolean(duplicate),
    reasons,
  };
}

function createReferral() {
  if (!isSalesEnabled()) {
    return {
      ok: false,
      error: "SALES_CLOSED",
      code: "SALES_CLOSED",
      status: 403,
      created: false,
      rewardPoints: null,
      commercial: false,
      callerFlagIgnored: true,
    };
  }
  return {
    ok: false,
    error: "REFERRAL_UNVERIFIED",
    code: "REFERRAL_UNVERIFIED",
    status: 409,
    created: false,
    rewardPoints: null,
    commercial: false,
    callerFlagIgnored: true,
  };
}

function completeReferral(body = {}) {
  const code = String(body.code || "").trim();
  const duplicate = code ? referralCompletionAttempts.has(code) : false;
  if (code) referralCompletionAttempts.add(code);
  const referral = code ? db.prepare("SELECT * FROM mktloy_referrals WHERE code = ?").get(code) : null;
  return referralRefusal(body, referral, duplicate);
}

function cancelReferral(body = {}) {
  return referralRefusal(body, body.code ? db.prepare("SELECT * FROM mktloy_referrals WHERE code = ?").get(String(body.code)) : null, false);
}

const preferenceWithdrawals = new Set();

function explicitTrue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function explicitFalse(value) {
  return value === false || value === 0 || value === "0" || value === "false";
}

function preferenceId(customerId) {
  const raw = String(customerId ?? "").trim();
  return /^[1-9]\d{0,17}$/.test(raw) ? raw : null;
}

function preferenceChannels(body = {}) {
  const all = body.withdraw === true || body.unsubscribe === true || body.revoked === true || explicitFalse(body.marketing) || explicitFalse(body.consent);
  const email = all || explicitFalse(body.emailOptIn) || explicitFalse(body.email_opt_in);
  const sms = all || explicitFalse(body.smsOptIn) || explicitFalse(body.sms_opt_in);
  const push = all || explicitFalse(body.pushOptIn) || explicitFalse(body.push_opt_in);
  const whatsapp = all || explicitFalse(body.whatsappOptIn) || explicitFalse(body.whatsapp);
  const grant = explicitTrue(body.consent) || explicitTrue(body.approved) || explicitTrue(body.verified) || explicitTrue(body.marketing) || explicitTrue(body.emailOptIn) || explicitTrue(body.email_opt_in) || explicitTrue(body.smsOptIn) || explicitTrue(body.sms_opt_in) || explicitTrue(body.pushOptIn) || explicitTrue(body.push_opt_in) || explicitTrue(body.whatsappOptIn) || explicitTrue(body.whatsapp);
  return { all, email, sms, push, whatsapp, any: email || sms || push || whatsapp, grant };
}

function preferenceResult(extra = {}) {
  return {
    ok: false,
    granted: false,
    consentVerified: false,
    consentSource: "UNKNOWN",
    consentScope: "UNKNOWN",
    consentAt: null,
    preferenceOnly: true,
    notificationSent: false,
    customerNotified: false,
    emailSent: false,
    smsSent: false,
    whatsappSent: false,
    campaignCreated: false,
    couponIssued: false,
    referralCreated: false,
    balanceChanged: false,
    orderCreated: false,
    callerFlagIgnored: true,
    ...extra,
  };
}

function updatePreferences(customerId, body = {}) {
  const id = preferenceId(customerId);
  const channels = preferenceChannels(body);
  if (!id) {
    return preferenceResult({
      code: "UNKNOWN",
      status: 400,
      marketingPermission: "UNKNOWN",
      withdrawn: false,
      stored: false,
      reasons: ["UNKNOWN"],
    });
  }
  if (!channels.any) {
    return preferenceResult({
      code: "CONSENT_UNVERIFIED",
      status: 403,
      marketingPermission: "BLOCKED",
      withdrawn: false,
      stored: false,
      reasons: ["CONSENT_UNVERIFIED", "SALES_CLOSED"],
    });
  }

  const duplicate = preferenceWithdrawals.has(id);
  preferenceWithdrawals.add(id);
  const existing = db.prepare("SELECT email_opt_in, sms_opt_in, push_opt_in FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id) || {
    email_opt_in: 0,
    sms_opt_in: 0,
    push_opt_in: 0,
  };
  const keep = (previous, withdraw) => (withdraw ? 0 : Number(previous) === 1 ? 1 : 0);
  db.prepare(`
    INSERT INTO mktloy_marketing_preferences(customer_id, email_opt_in, sms_opt_in, push_opt_in)
    VALUES(?,?,?,?)
    ON CONFLICT(customer_id) DO UPDATE SET
      email_opt_in = excluded.email_opt_in,
      sms_opt_in = excluded.sms_opt_in,
      push_opt_in = excluded.push_opt_in,
      updated_at = CURRENT_TIMESTAMP
  `).run(id, keep(existing.email_opt_in, channels.email), keep(existing.sms_opt_in, channels.sms), keep(existing.push_opt_in, channels.push));

  return preferenceResult({
    code: "WITHDRAWN",
    status: 200,
    marketingPermission: "WITHDRAWN",
    withdrawn: true,
    stored: true,
    duplicate,
    idempotent: true,
    reasons: ["WITHDRAWN"],
  });
}

function getPreferences(customerId) {
  const id = preferenceId(customerId);
  if (!id) {
    return preferenceResult({ code: "UNKNOWN", marketingPermission: "UNKNOWN", stored: false });
  }
  const row = db.prepare("SELECT email_opt_in, sms_opt_in, push_opt_in FROM mktloy_marketing_preferences WHERE customer_id = ?").get(id);
  if (!row) {
    return preferenceResult({ code: "UNKNOWN", marketingPermission: "UNKNOWN", stored: false, emailPermission: "UNKNOWN", smsPermission: "UNKNOWN", pushPermission: "UNKNOWN" });
  }
  const channel = (value) => (Number(value) === 0 ? "WITHDRAWN" : "BLOCKED");
  const permissions = [channel(row.email_opt_in), channel(row.sms_opt_in), channel(row.push_opt_in)];
  return preferenceResult({
    code: permissions.every((item) => item === "WITHDRAWN") ? "WITHDRAWN" : "CONSENT_UNVERIFIED",
    marketingPermission: permissions.every((item) => item === "WITHDRAWN") ? "WITHDRAWN" : "BLOCKED",
    emailPermission: channel(row.email_opt_in),
    smsPermission: channel(row.sms_opt_in),
    pushPermission: channel(row.push_opt_in),
    stored: true,
    granted: false,
  });
}

function getMarketingLoyaltyOverview() {
  return {
    campaigns: db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns").get().n,
    activeCampaigns: db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns WHERE status = 'active'").get().n,
    promotionUses: db.prepare("SELECT COUNT(*) n FROM mktloy_promotion_uses").get().n,
    loyaltyCustomers: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n,
    loyaltyPoints: db.prepare("SELECT COALESCE(SUM(points_balance), 0) n FROM mktloy_loyalty_accounts").get().n,
    referrals: db.prepare("SELECT COUNT(*) n FROM mktloy_referrals").get().n,
    completedReferrals: db
      .prepare("SELECT COUNT(*) n FROM mktloy_referrals WHERE status = 'completed'")
      .get().n,
  };
}

function getMarketingLoyaltyStatus() {
  const overview = getMarketingLoyaltyOverview();
  return {
    version: "2.6.0",
    enabled: isEnabled(),
    totals: {
      campaigns: overview.campaigns,
      activeCampaigns: overview.activeCampaigns,
      promotionUses: overview.promotionUses,
      loyaltyCustomers: overview.loyaltyCustomers,
      loyaltyPoints: overview.loyaltyPoints,
      referrals: overview.referrals,
      completedReferrals: overview.completedReferrals,
      tiers: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_tiers").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  seedTiers,
  createCampaign,
  listCampaigns,
  updateCampaign,
  applyCampaign,
  useCampaign,
  createLoyaltyAccount,
  adjustPoints,
  getLoyaltyProfile,
  createReferral,
  completeReferral,
  cancelReferral,
  updatePreferences,
  getPreferences,
  getMarketingLoyaltyOverview,
  getMarketingLoyaltyStatus,
};
