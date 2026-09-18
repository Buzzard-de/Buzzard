/**
 * Multi-provider payment production API (#350).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let mod = null;

function load() {
  if (mod) return mod;
  try {
    mod = require("../lib/PaymentProduction.bundle.cjs");
    return mod;
  } catch (err) {
    console.warn("Payment production bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = { userId: session.userId, id: session.userId, email: session.email, role: session.role };
  return session;
}

module.exports = {
  register(app) {
    app.get("/api/payment/methods", (req, res) => {
      const bundle = load();
      if (!bundle) {
        return res.status(503).json({ success: false, errorCode: "PAYMENT_PRODUCTION_UNAVAILABLE" });
      }
      const country = String(req.query.country || "DE").toUpperCase();
      const currency = String(req.query.currency || "EUR").toUpperCase();
      const amount = Number(req.query.amount || 0);
      const methods = bundle.getCheckoutPaymentMethods({
        country,
        currency,
        amount,
        customerType: req.query.customerType,
        market: req.query.market,
        deviceSupportsApplePay: req.query.deviceSupportsApplePay !== "0",
        deviceSupportsGooglePay: req.query.deviceSupportsGooglePay !== "0",
      });
      return res.json({ success: true, methods });
    });

    app.post("/api/payment/webhook/:provider", (req, res) => {
      const bundle = load();
      if (!bundle) {
        return res.status(503).json({ success: false, errorCode: "PAYMENT_PRODUCTION_UNAVAILABLE" });
      }
      const provider = String(req.params.provider || "").toUpperCase();
      const signature = req.headers["x-payment-signature"] || req.body?.signature || "";
      const timestamp = req.headers["x-payment-timestamp"] || req.body?.timestamp || "";
      const eventId = req.body?.eventId || req.body?.id || "";
      const result = bundle.handlePaymentWebhook(
        {
          provider,
          signature,
          timestamp,
          eventId,
          eventType: req.body?.eventType || req.body?.type || "",
          paymentId: req.body?.paymentId || "",
          orderId: req.body?.orderId,
        },
        { secretConfigured: Boolean(process.env.PAYPAL_WEBHOOK_SECRET_REF) },
      );
      if (!result.ok && !result.duplicate) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.status(result.duplicate ? 200 : 202).json({ success: true, duplicate: Boolean(result.duplicate) });
    });

    app.get("/api/admin/payment-production/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const bundle = load();
      if (!bundle) return res.status(503).json({ success: false, errorCode: "PAYMENT_PRODUCTION_UNAVAILABLE" });
      return res.json({
        success: true,
        data: bundle.getPaymentProductionDashboard(),
        providers: bundle.getPaymentProviderAdminStatuses(),
        source: "payment-production",
      });
    });

    app.get("/api/admin/payment-production/status-report", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const bundle = load();
      if (!bundle) return res.status(503).json({ success: false, errorCode: "PAYMENT_PRODUCTION_UNAVAILABLE" });
      return res.json({
        success: true,
        report: bundle.buildPaymentProductionStatusReport(),
        text: bundle.formatPaymentProductionReportText(),
      });
    });

    console.log("Payment production plugin loaded (#350 multi-provider)");
  },
};
