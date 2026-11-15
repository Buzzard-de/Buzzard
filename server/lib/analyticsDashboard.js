const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_ANALYTICS_DASHBOARD !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

const COMMERCIAL_EVENTS = new Set(["purchase", "purchased", "converted", "recovered", "paid", "sale", "order", "checkout_complete"]);

function recordEvent(body = {}) {
  const type = String(body.eventType || "").trim().toLowerCase();
  if (!type) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 400, stored: false, sale: false, revenue: null };
  const commercial = COMMERCIAL_EVENTS.has(type) || body.recovered === true || body.converted === true || body.paid === true || body.purchased === true;
  if (commercial || !require("./salesMode").isSalesEnabled()) {
    return {
      ok: false,
      error: commercial ? "SALES_CLOSED" : "SALES_CLOSED",
      code: "SALES_CLOSED",
      status: 403,
      stored: false,
      sale: false,
      revenue: null,
      recoveredIsSale: false,
      callerFlagIgnored: true,
    };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, sale: false, revenue: null };
}

function getSummary() {
  const sessions = db.prepare("SELECT COUNT(DISTINCT session_id) v FROM analytics_events").get().v;
  if (!require("./salesMode").isSalesEnabled()) {
    return {
      revenue: null,
      estimatedGrossProfit: null,
      orders: null,
      aov: null,
      countries: null,
      sessions,
      purchases: null,
      conversionRate: null,
      recoveredIsSale: false,
      salesStatus: "BLOCKED",
      code: "SALES_CLOSED",
    };
  }
  const revenue = db.prepare("SELECT COALESCE(SUM(revenue), 0) v FROM analytics_orders WHERE status = 'paid'").get().v;
  const cost = db.prepare("SELECT COALESCE(SUM(cost), 0) v FROM analytics_orders WHERE status = 'paid'").get().v;
  const orders = db.prepare("SELECT COUNT(*) v FROM analytics_orders WHERE status = 'paid'").get().v;
  const countries = db.prepare("SELECT COUNT(DISTINCT country_code) v FROM analytics_orders WHERE status = 'paid'").get().v;
  const purchases = db.prepare("SELECT COUNT(*) v FROM analytics_events WHERE event_type = 'purchase'").get().v;
  return {
    revenue,
    estimatedGrossProfit: revenue - cost,
    orders,
    aov: orders ? revenue / orders : 0,
    countries,
    sessions,
    purchases,
    conversionRate: sessions ? Number(((purchases / sessions) * 100).toFixed(2)) : 0,
    recoveredIsSale: false,
  };
}

function getDailySeries() {
  if (!require("./salesMode").isSalesEnabled()) return [];
  return db
    .prepare(`
      SELECT date(created_at) day, SUM(revenue) revenue, COUNT(*) orders, SUM(revenue - cost) gross_profit
      FROM analytics_orders
      WHERE status = 'paid'
      GROUP BY date(created_at)
      ORDER BY day
    `)
    .all();
}

function getCountryBreakdown() {
  if (!require("./salesMode").isSalesEnabled()) return [];
  return db
    .prepare(`
      SELECT country_code country, COUNT(*) orders, SUM(revenue) revenue, SUM(revenue - cost) gross_profit
      FROM analytics_orders
      WHERE status = 'paid'
      GROUP BY country_code
      ORDER BY revenue DESC
    `)
    .all();
}

function getCategoryBreakdown() {
  if (!require("./salesMode").isSalesEnabled()) return [];
  return db
    .prepare(`
      SELECT category, COUNT(*) orders, SUM(revenue) revenue, SUM(revenue - cost) gross_profit
      FROM analytics_orders
      WHERE status = 'paid'
      GROUP BY category
      ORDER BY revenue DESC
    `)
    .all();
}

function getProductBreakdown() {
  if (!require("./salesMode").isSalesEnabled()) return [];
  return db
    .prepare(`
      SELECT product_sku sku, product_name name, COUNT(*) orders, SUM(revenue) revenue, SUM(revenue - cost) gross_profit
      FROM analytics_orders
      WHERE status = 'paid'
      GROUP BY product_sku, product_name
      ORDER BY revenue DESC
      LIMIT 50
    `)
    .all();
}

function getSourceBreakdown() {
  if (!require("./salesMode").isSalesEnabled()) return [];
  return db
    .prepare(`
      SELECT source, COUNT(*) purchases, SUM(revenue) revenue, SUM(revenue - cost) gross_profit
      FROM analytics_orders
      WHERE status = 'paid'
      GROUP BY source
      ORDER BY revenue DESC
    `)
    .all();
}

function getFunnel() {
  const rows = db
    .prepare("SELECT event_type, COUNT(*) count FROM analytics_events GROUP BY event_type")
    .all();
  const get = (type) => rows.find((row) => row.event_type === type)?.count || 0;
  const pageViews = get("page_view");
  const productViews = get("product_view");
  const addToCart = get("add_to_cart");
  const checkoutStarts = get("checkout_start");
  const purchases = require("./salesMode").isSalesEnabled() ? get("purchase") : null;

  return {
    pageViews,
    productViews,
    addToCart,
    checkoutStarts,
    purchases,
    productRate: pageViews ? Number(((productViews / pageViews) * 100).toFixed(2)) : 0,
    cartRate: productViews ? Number(((addToCart / productViews) * 100).toFixed(2)) : 0,
    checkoutRate: addToCart ? Number(((checkoutStarts / addToCart) * 100).toFixed(2)) : 0,
    purchaseRate: purchases == null || !checkoutStarts ? null : Number(((purchases / checkoutStarts) * 100).toFixed(2)),
    recoveredIsSale: false,
  };
}

function getAnalyticsDashboardStatus() {
  return {
    version: "1.3.0",
    enabled: isEnabled(),
    totals: {
      orders: db.prepare("SELECT COUNT(*) n FROM analytics_orders").get().n,
      events: db.prepare("SELECT COUNT(*) n FROM analytics_events").get().n,
      customers: db.prepare("SELECT COUNT(*) n FROM analytics_customers").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  recordEvent,
  getSummary,
  getDailySeries,
  getCountryBreakdown,
  getCategoryBreakdown,
  getProductBreakdown,
  getSourceBreakdown,
  getFunnel,
  getAnalyticsDashboardStatus,
};
