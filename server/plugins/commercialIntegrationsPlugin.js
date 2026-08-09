const { requireAuth, requireAdmin, extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const {
  payments,
  carriers,
  calculateTax,
  getExchangeRate,
  importSupplierFeed,
  checkTecDocCompatibility,
  forwardDropshipOrder,
  getIntegrationStatus,
} = require("../lib/commercialIntegrations");

function isEnabled() {
  return process.env.BUZZARD_COMMERCIAL_INTEGRATIONS !== "0";
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
      /* try JSON admin session next */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

function requireAnyAuth(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      req.user = verifyToken(bearer);
      return req.user;
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

  res.status(401).json({ error: "Authentication required" });
  return null;
}

module.exports = {
  register(app) {
    if (!isEnabled()) {
      console.log("Commercial integrations plugin disabled (BUZZARD_COMMERCIAL_INTEGRATIONS=0)");
      return;
    }

    app.get("/api/admin/integrations", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(getIntegrationStatus());
    });

    app.post("/api/payments/session", async (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const { provider = "stripe", orderId, amount, currency = "EUR" } = req.body || {};
      if (!payments[provider]) {
        return res.status(400).json({ error: "Unsupported payment provider" });
      }
      try {
        return res.json(await payments[provider]({ orderId, amount, currency }));
      } catch (error) {
        console.error("Payment session error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/shipping/label", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { carrier = "dhl", orderNumber, countryCode, weightKg, address } = req.body || {};
      if (!carriers[carrier]) {
        return res.status(400).json({ error: "Unsupported carrier" });
      }
      try {
        return res.json(await carriers[carrier]({ orderNumber, countryCode, weightKg, address }));
      } catch (error) {
        console.error("Shipping label error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/tax/quote", async (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const { countryCode = "DE", netAmount = 0, shipping = 0 } = req.body || {};
      try {
        return res.json(await calculateTax({ countryCode, netAmount, shipping }));
      } catch (error) {
        console.error("Tax quote error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/api/fx/rate", async (req, res) => {
      const from = String(req.query?.from || "EUR").toUpperCase();
      const to = String(req.query?.to || "EUR").toUpperCase();
      try {
        return res.json(await getExchangeRate({ from, to }));
      } catch (error) {
        console.error("FX rate error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/suppliers/import", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { supplier, format = "json", payload = null } = req.body || {};
      try {
        return res.json(await importSupplierFeed({ supplier, format, payload }));
      } catch (error) {
        console.error("Supplier import error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/tecdoc/compatibility", async (req, res) => {
      const { vehicle, productSku } = req.body || {};
      try {
        return res.json(await checkTecDocCompatibility({ vehicle, productSku }));
      } catch (error) {
        console.error("TecDoc compatibility error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/dropship/forward", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { supplier, order } = req.body || {};
      try {
        return res.json(await forwardDropshipOrder({ supplier, order }));
      } catch (error) {
        console.error("Dropship forward error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/webhooks/:provider", (req, res) => {
      return res.status(501).json({
        error: "Webhook adapter not configured",
        provider: req.params.provider,
        hint: "Implement official signature verification per provider before production",
      });
    });
  },
};
