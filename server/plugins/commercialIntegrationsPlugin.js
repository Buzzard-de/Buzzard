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

  res.status(403).json({ success: false, errorKey: "security.adminRequired" });
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

  res.status(401).json({ success: false, errorKey: "security.authRequired" });
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
      const {
        provider = "stripe",
        orderId,
        amount,
        currency = "EUR",
        successUrl,
        cancelUrl,
      } = req.body || {};
      if (!payments[provider]) {
        return res.status(400).json({ success: false, errorKey: "payment.unsupportedProvider" });
      }
      try {
        const payload = { orderId, amount, currency, successUrl, cancelUrl };
        return res.json(await payments[provider](payload));
      } catch (error) {
        console.error("Payment session error:", error.code || "payment.session_failed");
        return require("../lib/http/publicPluginError").sendPublicError(
          res,
          500,
          "payment.session_failed",
          error
        );
      }
    });

    app.post("/api/shipping/label", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { carrier = "dhl", orderNumber, countryCode, weightKg, address } = req.body || {};
      if (!carriers[carrier]) {
        return res.status(400).json({ success: false, errorKey: "shipping.unsupportedCarrier" });
      }
      try {
        return res.json(await carriers[carrier]({ orderNumber, countryCode, weightKg, address }));
      } catch (error) {
        console.error("Shipping label error:", require("../lib/security").publicTaskError(error, "shipping.labelFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.post("/api/tax/quote", async (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const { countryCode = "DE", netAmount = 0, shipping = 0 } = req.body || {};
      try {
        return res.json(await calculateTax({ countryCode, netAmount, shipping }));
      } catch (error) {
        console.error("Tax quote error:", require("../lib/security").publicTaskError(error, "tax.quoteFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.get("/api/fx/rate", async (req, res) => {
      const from = String(req.query?.from || "EUR").toUpperCase();
      const to = String(req.query?.to || "EUR").toUpperCase();
      try {
        return res.json(await getExchangeRate({ from, to }));
      } catch (error) {
        console.error("FX rate error:", require("../lib/security").publicTaskError(error, "fx.rateFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.post("/api/suppliers/import", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { supplier, format = "json", payload = null } = req.body || {};
      try {
        return res.json(await importSupplierFeed({ supplier, format, payload }));
      } catch (error) {
        console.error("Supplier import error:", require("../lib/security").publicTaskError(error, "supplier.importFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.post("/api/tecdoc/compatibility", async (req, res) => {
      const { vehicle, productSku } = req.body || {};
      try {
        return res.json(await checkTecDocCompatibility({ vehicle, productSku }));
      } catch (error) {
        console.error("TecDoc compatibility error:", require("../lib/security").publicTaskError(error, "tecdoc.compatFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.post("/api/dropship/forward", async (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { supplier, order } = req.body || {};
      try {
        return res.json(await forwardDropshipOrder({ supplier, order }));
      } catch (error) {
        console.error("Dropship forward error:", require("../lib/security").publicTaskError(error, "dropship.forwardFailed"));
        return res.status(500).json({ success: false, errorKey: "security.internalError" });
      }
    });

    app.post("/api/webhooks/:provider", (req, res) => {
      return res.status(501).json({
        success: false,
        errorKey: "webhook.notConfigured",
      });
    });
  },
};
