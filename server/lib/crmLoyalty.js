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

function addPoints(userId, points, reason, reference = "") {
  const delta = Number(points);
  db.prepare("INSERT INTO loyalty_ledger(user_id, points, reason, reference) VALUES(?,?,?,?)").run(
    userId,
    delta,
    reason || "",
    reference || ""
  );

  const current =
    db.prepare("SELECT points, lifetime_points FROM loyalty_accounts WHERE user_id = ?").get(userId) ||
    {};
  const nextPoints = Number(current.points || 0) + delta;
  const nextLifetime = Number(current.lifetime_points || 0) + Math.max(0, delta);
  const tier = loyaltyTier(nextLifetime);

  db.prepare(
    `INSERT INTO loyalty_accounts(user_id, points, lifetime_points, tier)
     VALUES(?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       points = excluded.points,
       lifetime_points = excluded.lifetime_points,
       tier = excluded.tier,
       updated_at = CURRENT_TIMESTAMP`
  ).run(userId, nextPoints, nextLifetime, tier);

  return db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId);
}

function getCrmProfile(userId) {
  const profile = db.prepare("SELECT * FROM crm_profiles WHERE user_id = ?").get(userId) || null;
  const loyalty =
    db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) ||
    { points: 0, lifetime_points: 0, tier: "Bronze" };
  return { profile, loyalty };
}

function upsertCrmProfile(userId, body = {}) {
  db.prepare(
    `INSERT INTO crm_profiles(
       user_id, phone, country_code, language, marketing_email, marketing_sms, marketing_whatsapp
     ) VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       phone = excluded.phone,
       country_code = excluded.country_code,
       language = excluded.language,
       marketing_email = excluded.marketing_email,
       marketing_sms = excluded.marketing_sms,
       marketing_whatsapp = excluded.marketing_whatsapp,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    userId,
    body.phone || "",
    (body.countryCode || "DE").toUpperCase(),
    body.language || "de-DE",
    body.marketingEmail ? 1 : 0,
    body.marketingSms ? 1 : 0,
    body.marketingWhatsapp ? 1 : 0
  );
  return { ok: true };
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

function earnPoints(userId, body = {}) {
  const points = Math.max(0, Math.floor(Number(body.points || 0)));
  if (!points) return { error: "Positive points required", status: 400 };
  const account = addPoints(userId, points, body.reason || "manual", body.reference || "");
  return account;
}

function redeemReward(userId, rewardId) {
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ? AND active = 1").get(rewardId);
  const account =
    db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) || { points: 0 };
  if (!reward) return { error: "Reward not found", status: 404 };
  if (Number(account.points || 0) < reward.points_cost) {
    return { error: "Not enough points", status: 400 };
  }

  addPoints(userId, -reward.points_cost, "reward redemption", reward.code);
  const code = `BZ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  db.prepare(
    "INSERT INTO offers(user_id, title, code, discount_type, discount_value) VALUES(?,?,?,?,?)"
  ).run(userId, reward.title, code, reward.discount_type, reward.discount_value);

  return { ok: true, code, reward };
}

function trackAbandonedCart(userId, body = {}) {
  const key = cartKey(userId);
  db.prepare(
    `INSERT INTO abandoned_carts(user_id, cart_key, subtotal, currency, item_count, last_seen_at)
     VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(cart_key) DO UPDATE SET
       subtotal = excluded.subtotal,
       currency = excluded.currency,
       item_count = excluded.item_count,
       last_seen_at = CURRENT_TIMESTAMP,
       status = 'open'`
  ).run(
    userId,
    key,
    Number(body.subtotal || 0),
    body.currency || "EUR",
    Number(body.itemCount || 0)
  );
  return { ok: true, cartKey: key };
}

function markCartRecovered(userId) {
  const key = cartKey(userId);
  db.prepare(
    "UPDATE abandoned_carts SET status = 'recovered', recovered_at = CURRENT_TIMESTAMP WHERE cart_key = ?"
  ).run(key);
  return { ok: true };
}

function listUserOffers(userId) {
  return db
    .prepare("SELECT * FROM offers WHERE user_id = ? AND status = 'active' ORDER BY id DESC")
    .all(userId);
}

function queueRecoveryCampaigns(channel = "email") {
  const carts = db
    .prepare(
      "SELECT * FROM abandoned_carts WHERE status = 'open' AND datetime(last_seen_at) < datetime('now', '-24 hours')"
    )
    .all();
  const insert = db.prepare(
    "INSERT INTO recovery_campaigns(abandoned_cart_id, channel, scheduled_at) VALUES(?,?,datetime('now'))"
  );
  const tx = db.transaction(() => {
    for (const cart of carts) insert.run(cart.id, channel);
  });
  tx();
  return { queued: carts.length };
}

function listSegmentsAdmin() {
  return db.prepare("SELECT * FROM customer_segments ORDER BY id").all();
}

function listAbandonedCartsAdmin() {
  return db
    .prepare("SELECT * FROM abandoned_carts ORDER BY last_seen_at DESC LIMIT 200")
    .all();
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
      recoveryCampaigns: db.prepare("SELECT COUNT(*) n FROM recovery_campaigns").get().n,
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
