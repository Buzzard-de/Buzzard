const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CRM_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function loyaltyTier(lifetimePoints) {
  const points = Number(lifetimePoints || 0);
  if (points >= 10000) return "Platinum";
  if (points >= 5000) return "Gold";
  if (points >= 1500) return "Silver";
  return "Bronze";
}

function cartKey(userId) {
  return crypto.createHash("sha1").update(`${String(userId)}|buzzard`).digest("hex");
}

function addPoints() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
}

function getCrmProfile(userId) {
  const profile = db.prepare("SELECT * FROM crm_profiles WHERE user_id = ?").get(userId) || null;
  const loyalty =
    db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) ||
    { points: 0, lifetime_points: 0, tier: "Bronze" };
  return { profile, loyalty };
}

function upsertCrmProfile(userId, body = {}) {
  const id = String(userId ?? "").trim();
  if (!/^[1-9]\d{0,17}$/.test(id)) {
    return { ok: false, code: "UNKNOWN", marketingPermission: "UNKNOWN", stored: false, granted: false, consentVerified: false, notificationSent: false };
  }
  const grant = body.marketingEmail === true || body.marketingSms === true || body.marketingWhatsapp === true || body.consent === true || body.approved === true || body.verified === true;
  const withdrawn = body.marketingEmail === false || body.marketingSms === false || body.marketingWhatsapp === false || body.withdraw === true || body.unsubscribe === true;
  try {
    db.prepare(
      `INSERT INTO crm_profiles(
         user_id, phone, country_code, language, marketing_email, marketing_sms, marketing_whatsapp
       ) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET
         country_code = excluded.country_code,
         language = excluded.language,
         marketing_email = 0,
         marketing_sms = 0,
         marketing_whatsapp = 0,
         updated_at = CURRENT_TIMESTAMP`
    ).run(id, "", (body.countryCode || "DE").toUpperCase(), body.language || "de-DE", 0, 0, 0);
  } catch {
    return {
      ok: false,
      code: "UNKNOWN",
      marketingPermission: "BLOCKED",
      stored: false,
      granted: false,
      withdrawn: false,
      consentVerified: false,
      notificationSent: false,
      customerNotified: false,
    };
  }
  return {
    ok: false,
    code: grant && !withdrawn ? "CONSENT_UNVERIFIED" : withdrawn ? "WITHDRAWN" : "CONSENT_UNVERIFIED",
    marketingPermission: withdrawn ? "WITHDRAWN" : "BLOCKED",
    stored: true,
    granted: false,
    withdrawn,
    consentVerified: false,
    consentSource: "UNKNOWN",
    notificationSent: false,
    customerNotified: false,
    callerFlagIgnored: true,
  };
}

function getLoyaltyDashboard(userId) {
  const account =
    db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) ||
    { points: 0, lifetime_points: 0, tier: "Bronze" };
  const ledger = db
    .prepare("SELECT * FROM loyalty_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50")
    .all(userId);
  const rewards = db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY points_cost").all();
  return { account, ledger, rewards };
}

function earnPoints() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
}

function redeemReward() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, redeemed: false, couponIssued: false, balanceChanged: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, redeemed: false, couponIssued: false, balanceChanged: false, callerFlagIgnored: true };
}

function trackAbandonedCart() {
  return { ok: false, code: "CONSENT_UNVERIFIED", marketingPermission: "BLOCKED", stored: false, cartStored: false, notified: false, customerNotified: false };
}

const recoveryAttempts = new Set();

function markCartRecovered(userId, body = {}) {
  const id = String(userId ?? "").trim();
  const duplicate = id ? recoveryAttempts.has(id) : false;
  if (id) recoveryAttempts.add(id);
  const { isSalesEnabled } = require("./salesMode");
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("ORDER_UNVERIFIED");
  reasons.push("PAYMENT_UNVERIFIED");
  if (!/^[1-9]\d{0,17}$/.test(id)) reasons.push("UNKNOWN");
  let marketingPermission = "UNKNOWN";
  if (/^[1-9]\d{0,17}$/.test(id)) {
    const profile = db.prepare("SELECT marketing_email, marketing_sms, marketing_whatsapp FROM crm_profiles WHERE user_id = ?").get(id);
    if (!profile) marketingPermission = "BLOCKED";
    else if (Number(profile.marketing_email) === 0 && Number(profile.marketing_sms) === 0 && Number(profile.marketing_whatsapp) === 0) marketingPermission = "WITHDRAWN";
    else marketingPermission = "BLOCKED";
  }
  return {
    ok: false,
    error: reasons[0] || "SALES_CLOSED",
    code: reasons[0] || "SALES_CLOSED",
    status: reasons[0] === "SALES_CLOSED" ? 403 : 409,
    recovered: false,
    converted: false,
    purchased: false,
    paid: false,
    completed: false,
    sale: false,
    saleRecorded: false,
    orderCreated: false,
    paymentCreated: false,
    revenue: null,
    couponIssued: false,
    pointsApplied: false,
    balanceChanged: false,
    campaignCreated: false,
    notificationSent: false,
    customerNotified: false,
    marketingPermission,
    consentVerified: false,
    callerFlagIgnored: true,
    idempotent: true,
    duplicate,
    reasons,
    ignored: body ? true : true,
  };
}

function listUserOffers(userId) {
  return db
    .prepare("SELECT * FROM offers WHERE user_id = ? AND status = 'active' ORDER BY id DESC")
    .all(userId);
}

function queueRecoveryCampaigns() {
  return { ok: false, queued: 0, stored: false, customerNotified: false, notificationSent: false, code: "CONSENT_UNVERIFIED", marketingPermission: "BLOCKED" };
}

function listSegmentsAdmin() {
  return db.prepare("SELECT * FROM customer_segments ORDER BY id").all();
}

function listAbandonedCartsAdmin() {
  return db
    .prepare("SELECT id, user_id, status, item_count, last_seen_at FROM abandoned_carts ORDER BY last_seen_at DESC LIMIT 200")
    .all()
    .map((row) => ({
      id: row.id,
      status: row.status,
      itemCount: row.item_count,
      sale: false,
      converted: false,
      revenue: null,
      orderCreated: false,
      recoveredIsSale: false,
    }));
}

function listOffersAdmin() {
  return db.prepare("SELECT * FROM offers ORDER BY id DESC LIMIT 200").all();
}

function listLoyaltyAccountsAdmin() {
  return db
    .prepare("SELECT * FROM loyalty_accounts ORDER BY lifetime_points DESC LIMIT 200")
    .all();
}

function getCrmLoyaltyStatus() {
  return {
    version: "1.2.0",
    enabled: isEnabled(),
    totals: {
      crmProfiles: db.prepare("SELECT COUNT(*) n FROM crm_profiles").get().n,
      loyaltyAccounts: db.prepare("SELECT COUNT(*) n FROM loyalty_accounts").get().n,
      rewards: db.prepare("SELECT COUNT(*) n FROM rewards WHERE active = 1").get().n,
      segments: db.prepare("SELECT COUNT(*) n FROM customer_segments").get().n,
      offers: db.prepare("SELECT COUNT(*) n FROM offers WHERE status = 'active'").get().n,
      abandonedCarts: db.prepare("SELECT COUNT(*) n FROM abandoned_carts WHERE status = 'open'").get().n,
      recoveredCarts: db.prepare("SELECT COUNT(*) n FROM abandoned_carts WHERE status = 'recovered'").get().n,
      recoveryCampaigns: db.prepare("SELECT COUNT(*) n FROM recovery_campaigns").get().n,
      salesFromRecovered: null,
      revenue: null,
      conversionCount: null,
      recoveredIsSale: false,
    },
  };
}

module.exports = {
  isEnabled,
  getCrmProfile,
  upsertCrmProfile,
  getLoyaltyDashboard,
  earnPoints,
  redeemReward,
  trackAbandonedCart,
  markCartRecovered,
  listUserOffers,
  queueRecoveryCampaigns,
  listSegmentsAdmin,
  listAbandonedCartsAdmin,
  listOffersAdmin,
  listLoyaltyAccountsAdmin,
  getCrmLoyaltyStatus,
  addPoints,
};
