const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_MARKETING_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function referralCode() {
  return `BUZ-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
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

function createCampaign(body = {}) {
  if (!body.code || !body.name) {
    return { error: "Code and name required", status: 400 };
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO mktloy_campaigns(
          code, name, type, status, audience_segment, discount_type, discount_value,
          minimum_order, max_uses, starts_at, ends_at, channel
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        String(body.code).toUpperCase(),
        body.name,
        body.type || "coupon",
        body.status || "draft",
        body.audienceSegment || body.audience_segment || "all",
        body.discountType || body.discount_type || "percent",
        Number(body.discountValue ?? body.discount_value ?? 0),
        Number(body.minimumOrder ?? body.minimum_order ?? 0),
        Number(body.maxUses ?? body.max_uses ?? 0),
        body.startsAt || body.starts_at || null,
        body.endsAt || body.ends_at || null,
        body.channel || "all"
      );

    return {
      campaign: db.prepare("SELECT * FROM mktloy_campaigns WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "Campaign code already exists", status: 409 };
  }
}

function listCampaigns() {
  return db.prepare("SELECT * FROM mktloy_campaigns ORDER BY id DESC").all();
}

function updateCampaign(id, body = {}) {
  const campaign = db.prepare("SELECT * FROM mktloy_campaigns WHERE id = ?").get(id);
  if (!campaign) return { error: "Campaign not found", status: 404 };

  db.prepare(`
    UPDATE mktloy_campaigns
    SET name = ?, status = ?, audience_segment = ?, discount_type = ?, discount_value = ?,
        minimum_order = ?, max_uses = ?, starts_at = ?, ends_at = ?, channel = ?
    WHERE id = ?
  `).run(
    body.name ?? campaign.name,
    body.status ?? campaign.status,
    body.audienceSegment ?? body.audience_segment ?? campaign.audience_segment,
    body.discountType ?? body.discount_type ?? campaign.discount_type,
    body.discountValue ?? body.discount_value ?? campaign.discount_value,
    body.minimumOrder ?? body.minimum_order ?? campaign.minimum_order,
    body.maxUses ?? body.max_uses ?? campaign.max_uses,
    body.startsAt ?? body.starts_at ?? campaign.starts_at,
    body.endsAt ?? body.ends_at ?? campaign.ends_at,
    body.channel ?? campaign.channel,
    campaign.id
  );

  return { campaign: db.prepare("SELECT * FROM mktloy_campaigns WHERE id = ?").get(campaign.id) };
}

function applyCampaign(code, body = {}) {
  const campaign = db
    .prepare(`
      SELECT * FROM mktloy_campaigns
      WHERE code = ?
        AND status = 'active'
        AND (starts_at IS NULL OR starts_at <= datetime('now'))
        AND (ends_at IS NULL OR ends_at > datetime('now'))
    `)
    .get(String(code).toUpperCase());

  if (!campaign) return { error: "Campaign inactive or not found", status: 404 };

  const subtotal = Number(body.subtotal || 0);
  if (subtotal < campaign.minimum_order) {
    return { error: "Minimum order not reached", status: 400 };
  }
  if (campaign.max_uses > 0 && campaign.used_count >= campaign.max_uses) {
    return { error: "Campaign usage limit reached", status: 400 };
  }

  const discount =
    campaign.discount_type === "percent"
      ? (subtotal * campaign.discount_value) / 100
      : Math.min(campaign.discount_value, subtotal);

  return {
    valid: true,
    campaign: campaign.code,
    discount,
    finalTotal: subtotal - discount,
  };
}

function useCampaign(code, body = {}) {
  const campaign = db.prepare("SELECT * FROM mktloy_campaigns WHERE code = ?").get(String(code).toUpperCase());
  if (!campaign) return { error: "Campaign not found", status: 404 };

  db.prepare("UPDATE mktloy_campaigns SET used_count = used_count + 1 WHERE id = ?").run(campaign.id);
  db.prepare(`
    INSERT INTO mktloy_promotion_uses(campaign_id, customer_id, order_number, discount_amount)
    VALUES(?,?,?,?)
  `).run(
    campaign.id,
    body.customerId || body.customer_id || null,
    body.orderNumber || body.order_number || "",
    Number(body.discountAmount ?? body.discount_amount ?? 0)
  );

  return { ok: true };
}

function createLoyaltyAccount(body = {}) {
  const customerId = body.customerId || body.customer_id;
  if (!customerId) return { error: "customerId required", status: 400 };

  let account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) {
    seedTiers();
    const tier = db.prepare("SELECT id FROM mktloy_loyalty_tiers WHERE code = 'BRONZE'").get();
    const result = db
      .prepare("INSERT INTO mktloy_loyalty_accounts(customer_id, tier_id) VALUES(?,?)")
      .run(customerId, tier.id);
    account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE id = ?").get(result.lastInsertRowid);
  }

  return {
    ...account,
    tier: db.prepare("SELECT * FROM mktloy_loyalty_tiers WHERE id = ?").get(account.tier_id),
  };
}

function adjustPoints(body = {}) {
  const points = Number(body.points || 0);
  const customerId = body.customerId || body.customer_id;
  if (!customerId || !points) {
    return { error: "Customer and points required", status: 400 };
  }

  let account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) {
    db.prepare("INSERT INTO mktloy_loyalty_accounts(customer_id) VALUES(?)").run(customerId);
    account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  }

  const newBalance = account.points_balance + points;
  const lifetime = Math.max(account.lifetime_points, account.lifetime_points + Math.max(points, 0));
  db.prepare(`
    UPDATE mktloy_loyalty_accounts
    SET points_balance = ?, lifetime_points = ?, updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `).run(newBalance, lifetime, customerId);

  db.prepare(`
    INSERT INTO mktloy_loyalty_ledger(customer_id, points, type, reference, description)
    VALUES(?,?,?,?,?)
  `).run(
    customerId,
    points,
    body.type || "adjustment",
    body.reference || "",
    body.description || ""
  );

  refreshTier(customerId);
  return { account: db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId) };
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

function createReferral(body = {}) {
  const referrerCustomerId = body.referrerCustomerId || body.referrer_customer_id;
  if (!referrerCustomerId) return { error: "Referrer required", status: 400 };

  let code;
  do {
    code = referralCode();
  } while (db.prepare("SELECT id FROM mktloy_referrals WHERE code = ?").get(code));

  const result = db
    .prepare("INSERT INTO mktloy_referrals(referrer_customer_id, code, reward_points) VALUES(?,?,?)")
    .run(referrerCustomerId, code, Number(body.rewardPoints ?? body.reward_points ?? 250));

  return {
    referral: db.prepare("SELECT * FROM mktloy_referrals WHERE id = ?").get(result.lastInsertRowid),
    created: true,
  };
}

function completeReferral(body = {}) {
  const referral = db
    .prepare("SELECT * FROM mktloy_referrals WHERE code = ? AND status = 'pending'")
    .get(body.code);
  if (!referral) return { error: "Referral not found", status: 404 };

  db.prepare(`
    UPDATE mktloy_referrals
    SET referred_customer_id = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(body.referredCustomerId || body.referred_customer_id, referral.id);

  db.prepare(`
    INSERT INTO mktloy_loyalty_ledger(customer_id, points, type, reference, description)
    VALUES(?,?,?,?,?)
  `).run(referral.referrer_customer_id, referral.reward_points, "referral", referral.code, "Referral reward");

  let account = db
    .prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?")
    .get(referral.referrer_customer_id);
  if (!account) {
    db.prepare("INSERT INTO mktloy_loyalty_accounts(customer_id) VALUES(?)").run(referral.referrer_customer_id);
    account = db
      .prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?")
      .get(referral.referrer_customer_id);
  }

  db.prepare(`
    UPDATE mktloy_loyalty_accounts
    SET points_balance = points_balance + ?, lifetime_points = lifetime_points + ?, updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `).run(referral.reward_points, referral.reward_points, referral.referrer_customer_id);

  refreshTier(referral.referrer_customer_id);
  return { ok: true, rewardPoints: referral.reward_points };
}

function updatePreferences(customerId, body = {}) {
  db.prepare(`
    INSERT INTO mktloy_marketing_preferences(customer_id, email_opt_in, sms_opt_in, push_opt_in)
    VALUES(?,?,?,?)
    ON CONFLICT(customer_id) DO UPDATE SET
      email_opt_in = excluded.email_opt_in,
      sms_opt_in = excluded.sms_opt_in,
      push_opt_in = excluded.push_opt_in,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    customerId,
    body.emailOptIn || body.email_opt_in ? 1 : 0,
    body.smsOptIn || body.sms_opt_in ? 1 : 0,
    body.pushOptIn || body.push_opt_in ? 1 : 0
  );

  return {
    preferences: db
      .prepare("SELECT * FROM mktloy_marketing_preferences WHERE customer_id = ?")
      .get(customerId),
  };
}

function getPreferences(customerId) {
  return (
    db.prepare("SELECT * FROM mktloy_marketing_preferences WHERE customer_id = ?").get(customerId) || {
      customer_id: Number(customerId),
      email_opt_in: 0,
      sms_opt_in: 0,
      push_opt_in: 0,
    }
  );
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
  updatePreferences,
  getPreferences,
  getMarketingLoyaltyOverview,
  getMarketingLoyaltyStatus,
};
