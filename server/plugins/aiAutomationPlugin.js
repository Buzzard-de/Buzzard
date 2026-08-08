const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { createRateLimiter } = require("../lib/security");
const automationEngine = require("../lib/automationEngine");
const notificationEngine = require("../lib/notificationEngine");
const aiChatService = require("../lib/aiChatService");
const phoneAssistantService = require("../lib/phoneAssistantService");
const recommendationService = require("../lib/recommendationService");
const productStore = require("../lib/productStore");
const supplierStore = require("../lib/supplierStore");
const fulfillmentStore = require("../lib/fulfillmentStore");

const dataDir = path.join(__dirname, "..", "data");
const cartsFile = path.join(dataDir, "abandoned-carts.json");
const chatRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 30, keyPrefix: "ai-chat:" });

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readCarts() {
  ensureDataDir();
  if (!fs.existsSync(cartsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(cartsFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeCarts(carts) {
  ensureDataDir();
  fs.writeFileSync(cartsFile, JSON.stringify(carts.slice(-500), null, 2), "utf8");
}

function collectHealth() {
  const products = productStore.listProducts({ status: "active" });
  const suppliers = supplierStore.listSuppliers?.() || [];
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 10);
  const failedFulfillments = fulfillmentStore.readFulfillments().filter((f) => f.status === "failed");

  return {
    status: "ok",
    app: "Buzzard API",
    timestamp: new Date().toISOString(),
    integrations: {
      payment: { configured: Boolean(process.env.PAYMENT_PROVIDER_SECRET), demoMode: !process.env.PAYMENT_PROVIDER_SECRET },
      supplier: { configured: Boolean(process.env.SUPPLIER_API_SECRET), demoMode: !process.env.SUPPLIER_API_SECRET },
      smtp: { configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER) },
      ai: { chatEnabled: process.env.BUZZARD_AI_CHAT_ENABLED !== "0", provider: process.env.AI_PROVIDER || "rules" },
    },
    data: {
      activeProducts: products.length,
      suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
      lowStockCount: lowStock.length,
      failedFulfillments: failedFulfillments.length,
    },
    automation: automationEngine.getStats(),
    observability: {
      structuredLogs: true,
      errorTrackingHook: Boolean(process.env.ERROR_TRACKING_DSN),
    },
  };
}

module.exports = {
  register(app) {
    app.get("/api/health", (_req, res) => {
      return res.json({ success: true, ...collectHealth() });
    });

    app.post("/api/ai/chat", (req, res) => {
      if (process.env.BUZZARD_AI_CHAT_ENABLED === "0") {
        return res.status(503).json({ success: false, errorKey: "ai.chat.disabled" });
      }
      if (chatRateLimit(req)) {
        return res.status(429).json({ success: false, errorKey: "ai.chat.rateLimited" });
      }
      const result = aiChatService.handleMessage({
        message: req.body?.message,
        sessionId: req.body?.sessionId,
        locale: req.body?.locale,
        customerEmail: req.body?.customerEmail,
        productContext: req.body?.productContext,
      });
      if (!result.ok) {
        return res.status(400).json({ success: false, errorKey: result.errorKey });
      }
      return res.json({ success: true, ...result });
    });

    app.get("/api/ai/recommendations", (req, res) => {
      const items = recommendationService.getRecommendations({
        productId: req.query?.productId,
        query: req.query?.q,
        categoryId: req.query?.categoryId,
        limit: Math.min(Number(req.query?.limit) || 6, 12),
        viewedIds: String(req.query?.viewed || "")
          .split(",")
          .filter(Boolean),
      });
      return res.json({ success: true, items });
    });

    app.post("/api/ai/phone/verify-order", (req, res) => {
      const result = phoneAssistantService.verifyOrderAccess(req.body || {});
      if (!result.ok) return res.status(404).json({ success: false, errorKey: result.errorKey });
      return res.json({ success: true, ...result });
    });

    app.post("/api/ai/phone/order-status", (req, res) => {
      const result = phoneAssistantService.getVerifiedOrderStatus(req.body || {});
      if (!result.ok) return res.status(404).json({ success: false, errorKey: result.errorKey });
      return res.json({ success: true, ...result });
    });

    app.post("/api/ai/phone/escalate", (req, res) => {
      const result = phoneAssistantService.routeToHumanSupport(req.body?.locale);
      return res.json({ success: true, ...result });
    });

    app.post("/api/cart/abandoned", (req, res) => {
      const body = req.body || {};
      if (!body.email || !Array.isArray(body.lines) || body.lines.length === 0) {
        return res.status(400).json({ success: false, errorKey: "automation.abandoned.invalid" });
      }
      const carts = readCarts();
      const existing = carts.find((c) => c.email === body.email.toLowerCase() && c.status === "open");
      const entry = {
        id: existing?.id || crypto.randomUUID(),
        email: String(body.email).trim().toLowerCase(),
        lines: body.lines,
        locale: body.locale || "de",
        marketingConsent: body.marketingConsent !== false,
        unsubscribed: Boolean(body.unsubscribed),
        status: "open",
        updatedAt: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      const next = carts.filter((c) => c.id !== entry.id);
      next.push(entry);
      writeCarts(next);

      const delayHours = Number(process.env.BUZZARD_ABANDONED_CART_DELAY_HOURS || 24);
      const shouldNotify = !existing || Date.now() - new Date(existing.updatedAt).getTime() > delayHours * 3600 * 1000;
      if (shouldNotify) {
        automationEngine.emit(
          "abandoned_cart",
          {
            email: entry.email,
            cartId: entry.id,
            language: entry.locale,
            marketingConsent: entry.marketingConsent,
            unsubscribed: entry.unsubscribed,
          },
          { idempotencyKey: entry.id }
        );
      }

      return res.json({ success: true, cartId: entry.id, notified: shouldNotify });
    });

    app.get("/api/admin/automation/events", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "automation.read")) return;
      const events = automationEngine.listEvents({
        type: req.query?.type,
        limit: Math.min(Number(req.query?.limit) || 100, 200),
      });
      return res.json({ success: true, events, stats: automationEngine.getStats() });
    });

    app.get("/api/admin/automation/notifications", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "automation.read")) return;
      return res.json({
        success: true,
        notifications: notificationEngine.listNotifications(Number(req.query?.limit) || 100),
      });
    });

    app.post("/api/admin/automation/emit", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "automation.run")) return;
      const { eventType, payload, idempotencyKey } = req.body || {};
      if (!eventType) {
        return res.status(400).json({ success: false, errorKey: "automation.invalidEvent" });
      }
      const result = automationEngine.emit(eventType, payload || {}, { idempotencyKey });
      if (!result.ok) {
        return res.status(400).json({ success: false, errorKey: "automation.invalidEvent" });
      }
      return res.json({ success: true, ...result });
    });

    app.get("/api/admin/automation/abandoned-carts", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "automation.read")) return;
      return res.json({ success: true, carts: readCarts().slice().reverse() });
    });
  },
};
