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
  let database = { enabled: false };
  if (process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      database = require("../lib/db").getDatabaseHealth();
    } catch (error) {
      database = { enabled: true, error: error.message };
    }
  }

  let commercial = { enabled: false };
  if (process.env.BUZZARD_COMMERCIAL_INTEGRATIONS !== "0") {
    try {
      commercial = { enabled: true, ...require("../lib/commercialIntegrations").getIntegrationStatus() };
    } catch (error) {
      commercial = { enabled: true, error: error.message };
    }
  }

  let orderAutomation = { enabled: false };
  if (process.env.BUZZARD_ORDER_AUTOMATION !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      orderAutomation = { enabled: true, ...require("../lib/orderAutomation").getAutomationStatus() };
    } catch (error) {
      orderAutomation = { enabled: true, error: error.message };
    }
  }

  let supplierHub = { enabled: false };
  if (process.env.BUZZARD_SUPPLIER_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      supplierHub = { enabled: true, ...require("../lib/supplierHub").getSupplierHubStatus() };
    } catch (error) {
      supplierHub = { enabled: true, error: error.message };
    }
  }

  let catalogSeo = { enabled: false };
  if (process.env.BUZZARD_CATALOG_SEO !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      catalogSeo = { enabled: true, ...require("../lib/catalogSeo").getCatalogSeoStatus() };
    } catch (error) {
      catalogSeo = { enabled: true, error: error.message };
    }
  }

  let localizationFeeds = { enabled: false };
  if (process.env.BUZZARD_LOCALIZATION_FEEDS !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      localizationFeeds = { enabled: true, ...require("../lib/localizationFeeds").getLocalizationFeedsStatus() };
    } catch (error) {
      localizationFeeds = { enabled: true, error: error.message };
    }
  }

  let customerCheckout = { enabled: false };
  if (process.env.BUZZARD_CUSTOMER_CHECKOUT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      customerCheckout = { enabled: true, ...require("../lib/customerCheckout").getCustomerCheckoutStatus() };
    } catch (error) {
      customerCheckout = { enabled: true, error: error.message };
    }
  }

  let customerSupport = { enabled: false };
  if (process.env.BUZZARD_CUSTOMER_SUPPORT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      customerSupport = { enabled: true, ...require("../lib/customerSupport").getCustomerSupportStatus() };
    } catch (error) {
      customerSupport = { enabled: true, error: error.message };
    }
  }

  let crmLoyalty = { enabled: false };
  if (process.env.BUZZARD_CRM_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      crmLoyalty = { enabled: true, ...require("../lib/crmLoyalty").getCrmLoyaltyStatus() };
    } catch (error) {
      crmLoyalty = { enabled: true, error: error.message };
    }
  }

  let analyticsDashboard = { enabled: false };
  if (process.env.BUZZARD_ANALYTICS_DASHBOARD !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      analyticsDashboard = {
        enabled: true,
        ...require("../lib/analyticsDashboard").getAnalyticsDashboardStatus(),
      };
    } catch (error) {
      analyticsDashboard = { enabled: true, error: error.message };
    }
  }

  let marketingCenter = { enabled: false };
  if (process.env.BUZZARD_MARKETING_CENTER !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      marketingCenter = {
        enabled: true,
        ...require("../lib/marketingCenter").getMarketingCenterStatus(),
      };
    } catch (error) {
      marketingCenter = { enabled: true, error: error.message };
    }
  }

  let marketplaceHub = { enabled: false };
  if (process.env.BUZZARD_MARKETPLACE_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      marketplaceHub = {
        enabled: true,
        ...require("../lib/marketplaceHub").getMarketplaceHubStatus(),
      };
    } catch (error) {
      marketplaceHub = { enabled: true, error: error.message };
    }
  }

  let logisticsFulfillment = { enabled: false };
  if (process.env.BUZZARD_LOGISTICS_FULFILLMENT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      logisticsFulfillment = {
        enabled: true,
        ...require("../lib/logisticsFulfillment").getLogisticsFulfillmentStatus(),
      };
    } catch (error) {
      logisticsFulfillment = { enabled: true, error: error.message };
    }
  }

  let wmsInventory = { enabled: false };
  if (process.env.BUZZARD_WMS_INVENTORY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      wmsInventory = {
        enabled: true,
        ...require("../lib/wmsInventory").getWmsInventoryStatus(),
      };
    } catch (error) {
      wmsInventory = { enabled: true, error: error.message };
    }
  }

  let pimCatalog = { enabled: false };
  if (process.env.BUZZARD_PIM_CATALOG !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      pimCatalog = {
        enabled: true,
        ...require("../lib/pimCatalog").getPimCatalogStatus(),
      };
    } catch (error) {
      pimCatalog = { enabled: true, error: error.message };
    }
  }

  let identitySecurity = { enabled: false };
  if (process.env.BUZZARD_IDENTITY_SECURITY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      identitySecurity = {
        enabled: true,
        ...require("../lib/identitySecurity").getIdentitySecurityStatus(),
      };
    } catch (error) {
      identitySecurity = { enabled: true, error: error.message };
    }
  }

  let paymentsFinance = { enabled: false };
  if (process.env.BUZZARD_PAYMENTS_FINANCE !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      paymentsFinance = {
        enabled: true,
        ...require("../lib/paymentsFinance").getPaymentsFinanceStatus(),
      };
    } catch (error) {
      paymentsFinance = { enabled: true, error: error.message };
    }
  }

  let orderManagement = { enabled: false };
  if (process.env.BUZZARD_ORDER_MANAGEMENT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      orderManagement = {
        enabled: true,
        ...require("../lib/orderManagement").getOrderManagementStatus(),
      };
    } catch (error) {
      orderManagement = { enabled: true, error: error.message };
    }
  }

  let cartCheckout = { enabled: false };
  if (process.env.BUZZARD_CART_CHECKOUT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      cartCheckout = {
        enabled: true,
        ...require("../lib/cartCheckout").getCartCheckoutStatus(),
      };
    } catch (error) {
      cartCheckout = { enabled: true, error: error.message };
    }
  }

  let crmCustomerService = { enabled: false };
  if (process.env.BUZZARD_CRM_CUSTOMER_SERVICE !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      crmCustomerService = {
        enabled: true,
        ...require("../lib/crmCustomerService").getCrmCustomerServiceStatus(),
      };
    } catch (error) {
      crmCustomerService = { enabled: true, error: error.message };
    }
  }

  let returnsRma = { enabled: false };
  if (process.env.BUZZARD_RETURNS_RMA !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      returnsRma = {
        enabled: true,
        ...require("../lib/returnsRma").getReturnsRmaStatus(),
      };
    } catch (error) {
      returnsRma = { enabled: true, error: error.message };
    }
  }

  return {
    status: "ok",
    app: "Buzzard API",
    timestamp: new Date().toISOString(),
    database,
    commercial,
    orderAutomation,
    supplierHub,
    catalogSeo,
    localizationFeeds,
    customerCheckout,
    customerSupport,
    crmLoyalty,
    analyticsDashboard,
    marketingCenter,
    marketplaceHub,
    logisticsFulfillment,
    wmsInventory,
    pimCatalog,
    identitySecurity,
    paymentsFinance,
    orderManagement,
    cartCheckout,
    crmCustomerService,
    returnsRma,
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
