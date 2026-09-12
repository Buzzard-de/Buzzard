const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const { extractToken, verifyToken } = require("../lib/dbAuth");

let foundation = null;

function loadFoundation() {
  if (foundation) return foundation;
  try {
    foundation = require("../lib/analyticsFoundation.bundle.cjs");
    return foundation;
  } catch (err) {
    console.warn("Analytics foundation bundle unavailable:", err.message);
    return null;
  }
}

function isFoundationEnabled() {
  return process.env.BUZZARD_ANALYTICS_FOUNDATION !== "0";
}

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ ok: false, errorCode: "ADMIN_UNAUTHORIZED" });
  return null;
}

module.exports = {
  register(app) {
    if (!isFoundationEnabled()) {
      console.log("Analytics foundation API disabled (BUZZARD_ANALYTICS_FOUNDATION=0)");
      return;
    }

    const mod = loadFoundation();
    if (mod?.getAnalyticsPersistenceMode) {
      console.log(`Analytics foundation persistence: ${mod.getAnalyticsPersistenceMode()}`);
    }

    app.post("/api/analytics/foundation/events", (req, res) => {
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ ok: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const result = mod.handleStorefrontAnalyticsEvent(req.body || {});
      if (!result.ok) {
        return res.status(result.blockedByConsent ? 403 : 400).json(result);
      }
      return res.status(202).json({ ok: true });
    });

    app.post("/api/analytics/foundation/purchase", (req, res) => {
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ ok: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const body = req.body || {};
      const commerceOrderId = String(body.orderId || "").trim();
      if (!commerceOrderId) return res.status(400).json({ ok: false, errorCode: "MISSING_ORDER_ID" });

      let orderEngineSync = null;
      try {
        orderEngineSync = require("../lib/commerce/orderEngineSync.js");
      } catch {
        /* optional */
      }

      const resolvedEngineOrderId = orderEngineSync?.resolveOrderIdForAnalytics?.(commerceOrderId);
      const commerceContext = orderEngineSync?.getCommerceOrderContext?.(commerceOrderId);
      const customerId = body.customerId || commerceContext?.customerId;

      const result = mod.handleStorefrontPurchaseSignal({
        orderId: resolvedEngineOrderId || commerceOrderId,
        correlationId: body.correlationId || commerceOrderId,
        customerId,
        revenue: body.revenue,
        total: body.total,
        subtotal: body.subtotal,
        tax: body.tax,
        discount: body.discount,
        shipping: body.shipping,
        currency: body.currency,
      });
      if (!result.ok) return res.status(400).json(result);
      return res.status(202).json({
        ok: true,
        eventId: result.event?.eventId,
        revenueAuthority: result.event?.revenueAuthority,
      });
    });

    app.get("/api/admin/analytics-foundation/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ ok: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const result = mod.getOverview({ adminAuthorized: true, actorId: "admin_api" });
      if (!result.ok) return res.status(401).json(result);
      return res.json({ success: true, data: result.data, source: "analytics-foundation" });
    });

    app.get("/api/admin/analytics-foundation/funnel", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ ok: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const section = req.query?.section || "funnel";
      const ctx = { adminAuthorized: true, actorId: "admin_api" };
      const handlers = {
        funnel: () => mod.getFunnel(ctx),
        traffic: () => mod.getTraffic(ctx),
        revenue: () => mod.getRevenue(ctx),
        channels: () => mod.getChannels(ctx),
        markets: () => mod.getMarkets(ctx),
        products: () => mod.getProducts(ctx),
      };
      const result = (handlers[section] || handlers.funnel)();
      if (!result.ok) return res.status(401).json(result);
      return res.json({ success: true, data: result.data, source: "analytics-foundation" });
    });
  },
};
