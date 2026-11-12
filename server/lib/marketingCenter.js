const { db } = require("./db");

const PROVIDERS = ["google_ads", "meta", "tiktok", "ebay", "amazon", "google_shopping"];

function isEnabled() {
  return process.env.BUZZARD_MARKETING_CENTER !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function roas(revenue, spend) {
  return spend > 0 ? Number((revenue / spend).toFixed(2)) : null;
}

function mapCampaignRow(campaign) {
  if (!require("./salesMode").isSalesEnabled()) {
    return {
      ...campaign,
      spend: null,
      revenue: null,
      orders: null,
      roas: null,
      profit_before_ad_spend: null,
      recoveredIsSale: false,
    };
  }
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

const campaignAttempts = new Set();

function campaignRefusal(extra = {}) {
  const { isSalesEnabled } = require("./salesMode");
  const closed = !isSalesEnabled();
  return {
    ok: false,
    error: closed ? "SALES_CLOSED" : "COUPON_UNVERIFIED",
    code: closed ? "SALES_CLOSED" : "COUPON_UNVERIFIED",
    status: closed ? 403 : 409,
    created: false,
    updated: false,
    deleted: false,
    stored: false,
    published: false,
    live: false,
    enabled: false,
    budget: null,
    spend: null,
    couponIssued: false,
    discountApplied: false,
    orderCreated: false,
    paymentCreated: false,
    customerNotified: false,
    consentVerified: false,
    callerFlagIgnored: true,
    landingUrl: null,
    ...extra,
  };
}

function updateProvider(provider) {
  if (!PROVIDERS.includes(provider)) return { ok: false, error: "Unsupported provider", code: "UNKNOWN", status: 404, stored: false, live: false };
  return campaignRefusal();
}

function createCampaign(body = {}) {
  const name = String(body.name || "").trim().toLowerCase();
  const duplicate = name ? campaignAttempts.has(name) : false;
  if (name) campaignAttempts.add(name);
  return campaignRefusal({ duplicate, idempotent: true });
}

function updateCampaign() {
  return campaignRefusal();
}

function deleteCampaign() {
  return campaignRefusal();
}

function listCampaigns() {
  return db
    .prepare("SELECT * FROM marketing_campaigns ORDER BY id DESC")
    .all()
    .map(mapCampaignRow);
}

function addCampaignSpend() {
  if (!require("./salesMode").isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, spend: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "PAYMENT_UNVERIFIED", code: "PAYMENT_UNVERIFIED", status: 409, stored: false, spend: null, callerFlagIgnored: true };
}

function recordConversion(body = {}) {
  if (!body.campaignId || !body.orderNumber) {
    return { error: "campaignId and orderNumber required", status: 400, stored: false };
  }
  return {
    ok: false,
    error: "PAYMENT_UNVERIFIED",
    code: "PAYMENT_UNVERIFIED",
    status: 409,
    stored: false,
    revenue: null,
    reconciled: false,
    live: false,
  };
}

function recordEvent(body = {}) {
  const type = String(body.eventType || "").trim().toLowerCase();
  if (!type) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 400, stored: false, sale: false, revenue: null };
  return {
    ok: false,
    error: "SALES_CLOSED",
    code: "SALES_CLOSED",
    status: 403,
    stored: false,
    sale: false,
    revenue: null,
    recoveredIsSale: false,
    callerFlagIgnored: true,
  };
}

function getSummary() {
  const spend = db.prepare("SELECT COALESCE(SUM(spend), 0) v FROM marketing_campaign_spend").get().v;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(revenue), 0) v FROM marketing_campaign_conversions")
    .get().v;
  const orders = db.prepare("SELECT COUNT(*) v FROM marketing_campaign_conversions").get().v;
  const campaigns = db.prepare("SELECT COUNT(*) v FROM marketing_campaigns").get().v;
  if (!require("./salesMode").isSalesEnabled()) {
    return {
      spend: null,
      revenue: null,
      orders: null,
      campaigns,
      recoveredIsSale: false,
      salesStatus: "BLOCKED",
      code: "SALES_CLOSED",
    };
  }
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
    .map((row) => (
      require("./salesMode").isSalesEnabled()
        ? { ...row, roas: roas(row.revenue, row.spend) }
        : { channel: row.channel, spend: null, revenue: null, orders: null, roas: null, recoveredIsSale: false, salesStatus: "BLOCKED" }
    ));
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
  const campaign = db.prepare("SELECT id, name, status FROM marketing_campaigns WHERE utm_campaign = ?").get(slug);
  if (!campaign) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 404, published: false, landingUrl: null };
  return campaignRefusal({ campaignStatus: "BLOCKED" });
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
  updateCampaign,
  deleteCampaign,
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
