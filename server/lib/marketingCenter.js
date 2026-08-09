const { db } = require("./db");

const PROVIDERS = ["google_ads", "meta", "tiktok", "ebay", "amazon", "google_shopping"];

function isEnabled() {
  return process.env.BUZZARD_MARKETING_CENTER !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function roas(revenue, spend) {
  return spend > 0 ? Number((revenue / spend).toFixed(2)) : null;
}

function mapCampaignRow(campaign) {
  const spend = db
    .prepare("SELECT COALESCE(SUM(spend), 0) v FROM marketing_campaign_spend WHERE campaign_id = ?")
    .get(campaign.id).v;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(revenue), 0) v FROM marketing_campaign_conversions WHERE campaign_id = ?")
    .get(campaign.id).v;
  const orders = db
    .prepare("SELECT COUNT(*) v FROM marketing_campaign_conversions WHERE campaign_id = ?")
    .get(campaign.id).v;
  return {
    ...campaign,
    spend,
    revenue,
    orders,
    roas: roas(revenue, spend),
    profit_before_ad_spend: revenue,
  };
}

function listProviders() {
  return db.prepare("SELECT * FROM marketing_provider_connections ORDER BY provider").all();
}

function updateProvider(provider, body = {}) {
  if (!PROVIDERS.includes(provider)) return { error: "Unsupported provider", status: 404 };
  db.prepare(
    "UPDATE marketing_provider_connections SET enabled = ?, account_label = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?"
  ).run(body.enabled ? 1 : 0, body.accountLabel || "", provider);
  return { provider: db.prepare("SELECT * FROM marketing_provider_connections WHERE provider = ?").get(provider) };
}

function createCampaign(body = {}) {
  if (!body.name || !body.channel) return { error: "name and channel required", status: 400 };
  const utmSource = body.utmSource || body.channel;
  const utmMedium = body.utmMedium || "paid";
  const utmCampaign =
    body.utmCampaign || String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  try {
    const result = db
      .prepare(`
        INSERT INTO marketing_campaigns(name, channel, objective, status, budget, start_date, end_date, utm_source, utm_medium, utm_campaign, coupon_code)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        body.name,
        body.channel,
        body.objective || "sales",
        body.status || "draft",
        Number(body.budget || 0),
        body.startDate || null,
        body.endDate || null,
        utmSource,
        utmMedium,
        utmCampaign,
        body.couponCode || ""
      );
    return {
      status: 201,
      campaign: db.prepare("SELECT * FROM marketing_campaigns WHERE id = ?").get(result.lastInsertRowid),
    };
  } catch {
    return { error: "Campaign name already exists", status: 409 };
  }
}

function listCampaigns() {
  return db
    .prepare("SELECT * FROM marketing_campaigns ORDER BY id DESC")
    .all()
    .map(mapCampaignRow);
}

function addCampaignSpend(campaignId, body = {}) {
  const campaign = db.prepare("SELECT id FROM marketing_campaigns WHERE id = ?").get(campaignId);
  if (!campaign) return { error: "Campaign not found", status: 404 };
  db.prepare(
    "INSERT INTO marketing_campaign_spend(campaign_id, spend, currency, spend_date) VALUES(?,?,?,?)"
  ).run(campaignId, Number(body.spend || 0), body.currency || "EUR", body.date || new Date().toISOString());
  return { ok: true };
}

function recordConversion(body = {}) {
  if (!body.campaignId || !body.orderNumber) {
    return { error: "campaignId and orderNumber required", status: 400 };
  }
  try {
    db.prepare(`
      INSERT INTO marketing_campaign_conversions(campaign_id, order_number, revenue, currency, source)
      VALUES(?,?,?,?,?)
    `).run(
      body.campaignId,
      body.orderNumber,
      Number(body.revenue || 0),
      body.currency || "EUR",
      body.source || "unknown"
    );
    return { ok: true, status: 202 };
  } catch {
    return { ok: true, idempotent: true, status: 202 };
  }
}

function recordEvent(body = {}) {
  if (!body.eventType) return { error: "eventType required", status: 400 };
  db.prepare(`
    INSERT INTO marketing_center_events(session_id, event_type, campaign, source, medium, country_code, product_sku)
    VALUES(?,?,?,?,?,?,?)
  `).run(
    body.sessionId || "",
    body.eventType,
    body.campaign || "",
    body.source || "",
    body.medium || "",
    (body.countryCode || "").toUpperCase(),
    body.productSku || ""
  );
  return { ok: true, status: 202 };
}

function getSummary() {
  const spend = db.prepare("SELECT COALESCE(SUM(spend), 0) v FROM marketing_campaign_spend").get().v;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(revenue), 0) v FROM marketing_campaign_conversions")
    .get().v;
  const orders = db.prepare("SELECT COUNT(*) v FROM marketing_campaign_conversions").get().v;
  const campaigns = db.prepare("SELECT COUNT(*) v FROM marketing_campaigns").get().v;
  return {
    spend,
    revenue,
    orders,
    campaigns,
    roas: roas(revenue, spend),
    net_after_ad_spend: Number((revenue - spend).toFixed(2)),
  };
}

function getChannelBreakdown() {
  return db
    .prepare(`
      SELECT c.channel,
             COALESCE(SUM(s.spend), 0) spend,
             COALESCE(SUM(v.revenue), 0) revenue,
             COUNT(DISTINCT v.id) orders
      FROM marketing_campaigns c
      LEFT JOIN marketing_campaign_spend s ON s.campaign_id = c.id
      LEFT JOIN marketing_campaign_conversions v ON v.campaign_id = c.id
      GROUP BY c.channel
      ORDER BY revenue DESC
    `)
    .all()
    .map((row) => ({ ...row, roas: roas(row.revenue, row.spend) }));
}

function getUtmBreakdown() {
  return db
    .prepare(`
      SELECT source, medium, campaign, COUNT(*) events
      FROM marketing_center_events
      WHERE campaign <> ''
      GROUP BY source, medium, campaign
      ORDER BY events DESC
    `)
    .all();
}

function getCampaignBySlug(slug) {
  const campaign = db.prepare("SELECT * FROM marketing_campaigns WHERE utm_campaign = ?").get(slug);
  if (!campaign) return { error: "Campaign not found", status: 404 };
  const base = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de";
  return {
    campaign,
    landingUrl: `${base.replace(/\/$/, "")}/?utm_source=${encodeURIComponent(campaign.utm_source)}&utm_medium=${encodeURIComponent(campaign.utm_medium)}&utm_campaign=${encodeURIComponent(campaign.utm_campaign)}`,
  };
}

function getMarketingCenterStatus() {
  return {
    version: "1.4.0",
    enabled: isEnabled(),
    providers: PROVIDERS.length,
    totals: {
      campaigns: db.prepare("SELECT COUNT(*) n FROM marketing_campaigns").get().n,
      events: db.prepare("SELECT COUNT(*) n FROM marketing_center_events").get().n,
      conversions: db.prepare("SELECT COUNT(*) n FROM marketing_campaign_conversions").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  PROVIDERS,
  listProviders,
  updateProvider,
  createCampaign,
  listCampaigns,
  addCampaignSpend,
  recordConversion,
  recordEvent,
  getSummary,
  getChannelBreakdown,
  getUtmBreakdown,
  getCampaignBySlug,
  getMarketingCenterStatus,
};
