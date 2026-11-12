const fs = require("fs");
const path = require("path");
const {
  login,
  logout,
  requireCustomer,
  extractToken,
  createSession,
} = require("../lib/customerAuth");
const customerStore = require("../lib/customerStore");
const fulfillmentStore = require("../lib/fulfillmentStore");
const { logAudit } = require("../lib/audit");
const customerOrderBridge = require("../lib/customer/customerOrderBridge");
const {
  recordCustomerAction,
  CUSTOMER_AUDIT_ACTIONS,
} = require("../lib/customer/customerExperienceAudit");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(body) {
  if (!body?.email || !EMAIL_REGEX.test(body.email)) return "account.register.invalidEmail";
  if (!body.firstName?.trim() || !body.lastName?.trim()) return "account.register.invalidName";
  if (!body.password || body.password.length < 8) return "account.register.weakPassword";
  if (body.password !== body.passwordConfirm) return "account.register.passwordMismatch";
  if (!body.acceptTerms) return "account.register.termsRequired";
  return null;
}

module.exports = {
  register(app) {
    app.post("/api/account/register", (req, res) => {
      const errorKey = validateRegister(req.body);
      if (errorKey) return res.status(400).json({ success: false, errorKey });

      const result = customerStore.register({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        country: req.body.country || "DE",
        phone: req.body.phone || "",
        marketing: req.body.marketing,
        language: req.body.language,
      });

      if (!result.success) return res.status(409).json(result);

      const session = createSession(result.customer);
      logAudit({
        userId: result.customer.id,
        userEmail: null,
        action: "register",
        entityType: "customer",
        entityId: result.customer.id,
        field: null,
        oldValue: null,
        newValue: result.customer.id,
      });
      req.customerSession = { customerId: result.customer.id, email: result.customer.email };
      recordCustomerAction(req, {
        action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_REGISTER,
        resource: "customer",
        resourceId: result.customer.id,
        result: "success",
      });

      try {
        const automationEngine = require("../lib/automationEngine");
        automationEngine.emit(
          "new_customer",
          {
            customerId: result.customer.id,
            language: req.body.language || "de",
            marketingConsent: Boolean(req.body.marketing),
          },
          { idempotencyKey: result.customer.id }
        );
      } catch {
        /* non-blocking */
      }

      return res.status(201).json({
        success: true,
        token: session.token,
        user: session.user,
        emailVerificationPending: !result.customer.emailVerified,
      });
    });

    app.post("/api/account/login", (req, res) => {
      const result = login(req.body?.email, req.body?.password, customerStore.verifyPassword, req);
      if (!result.success) return res.status(401).json(result);
      return res.json(result);
    });

    app.post("/api/account/logout", (req, res) => {
      logout(extractToken(req), req);
      return res.json({ success: true });
    });

    app.get("/api/account/me", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const customer = customerStore.findById(session.customerId);
      if (!customer) return res.status(404).json({ success: false, errorKey: "account.notFound" });
      return res.json({
        success: true,
        user: customerStore.publicUser(customer),
        preferences: customer.preferences,
        addressCount: customer.addresses?.length || 0,
        wishlistCount: customer.wishlist?.length || 0,
      });
    });

    app.put("/api/account/profile", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const updated = customerStore.updateProfile(session.customerId, req.body || {});
      if (!updated) return res.status(404).json({ success: false, errorKey: "account.notFound" });
      return res.json({ success: false, stored: true, shippingVerified: false, user: { id: updated.id, email: null, phone: null, emailVerified: false } });
    });

    app.get("/api/account/addresses", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      return res.json({ success: false, shippingVerified: false, delivered: false, addresses: customerStore.listAddresses(session.customerId) });
    });

    app.post("/api/account/addresses", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const address = customerStore.upsertAddress(session.customerId, req.body || {});
      if (!address) return res.status(400).json({ success: false, errorKey: "account.address.invalid" });
      return res.status(200).json({ success: false, shippingVerified: false, delivered: false, address });
    });

    app.put("/api/account/addresses/:id", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const address = customerStore.upsertAddress(session.customerId, { ...req.body, id: req.params.id });
      if (!address) return res.status(404).json({ success: false, errorKey: "account.address.notFound" });
      return res.json({ success: true, address });
    });

    app.delete("/api/account/addresses/:id", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const ok = customerStore.deleteAddress(session.customerId, req.params.id);
      if (!ok) return res.status(404).json({ success: false, errorKey: "account.address.notFound" });
      return res.json({ success: true });
    });

    app.get("/api/account/orders", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const customer = customerStore.findById(session.customerId);
      const orders = customerOrderBridge
        .listCustomerOrders(session.customerId, customer?.email)
        .map((order) => {
          if (order.source === "legacy_orders_json") {
            const clone = { ...order };
            clone.shipments = fulfillmentStore
              .listShipmentsForOrder(order.orderNumber)
              .map(fulfillmentStore.sanitizeShipment);
            return clone;
          }
          return order;
        });
      recordCustomerAction(req, {
        action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_ORDER_VIEW,
        resource: "order_list",
        resourceId: session.customerId,
        result: "success",
        metadata: { count: orders.length },
      });
      return res.json({ success: true, orders });
    });

    app.get("/api/account/orders/:orderNumber", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const customer = customerStore.findById(session.customerId);
      const order = customerOrderBridge.getCustomerOrder(
        req.params.orderNumber,
        session.customerId,
        customer?.email
      );
      if (!order) return res.status(404).json({ success: false, errorKey: "account.order.notFound" });
      recordCustomerAction(req, {
        action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_ORDER_VIEW,
        resource: "order",
        resourceId: req.params.orderNumber,
        result: "success",
      });
      return res.json({ success: true, order });
    });

    app.get("/api/account/wishlist", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      return res.json({ success: true, productIds: customerStore.getWishlist(session.customerId) });
    });

    app.put("/api/account/wishlist", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const ids = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
      const next = customerStore.setWishlist(session.customerId, ids);
      return res.json({ success: true, productIds: next });
    });

    app.post("/api/account/wishlist/toggle", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const productId = req.body?.productId;
      if (!productId) return res.status(400).json({ success: false, errorKey: "account.wishlist.invalid" });
      const next = customerStore.toggleWishlist(session.customerId, productId);
      return res.json({ success: true, productIds: next });
    });

    app.get("/api/account/preferences", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const customer = customerStore.findById(session.customerId);
      const preferences = { ...(customer?.preferences || {}) };
      const marketingPermission = preferences.marketing === false ? "WITHDRAWN" : preferences.marketingPermission || "UNKNOWN";
      for (const key of ["marketing", "marketingConsent", "emailOptIn", "smsOptIn", "pushOptIn", "whatsappOptIn", "consent"]) {
        if (preferences[key] === true) delete preferences[key];
      }
      preferences.granted = false;
      preferences.consentVerified = false;
      return res.json({ success: true, granted: false, consentVerified: false, marketingPermission, notificationSent: false, preferences });
    });

    app.put("/api/account/preferences", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const result = customerStore.updatePreferences(session.customerId, req.body || {});
      if (!result) return res.status(404).json({ success: false, code: "UNKNOWN", marketingPermission: "UNKNOWN", granted: false });
      return res.status(result.stored ? 200 : 403).json({
        success: false,
        granted: false,
        consentVerified: false,
        marketingPermission: result.marketingPermission,
        notificationSent: false,
        customerNotified: false,
        preferences: result.preferences,
      });
    });

    app.get("/api/account/export", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      return res.status(403).json({ success: false, exported: false, code: "EXPORT_BLOCKED", customer: null, email: null, phone: null });
    });

    app.post("/api/account/password-reset/request", (_req, res) => {
      return res.status(403).json({ success: false, sent: false, resetToken: null, email: null, customerNotified: false, code: "NOTIFICATION_NOT_PERMITTED" });
    });

    app.post("/api/account/password-reset/confirm", (_req, res) => {
      return res.status(403).json({ success: false, passwordChanged: false, code: "RESET_NOT_AUTHORIZED", email: null });
    });

    app.post("/api/account/deletion-request", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const requestedAt = customerStore.requestDeletion(session.customerId);
      recordCustomerAction(req, {
        action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_PRIVACY_DELETE,
        resource: "customer",
        resourceId: session.customerId,
        result: "pending_human_review",
      });
      return res.json({ success: true, requestedAt, status: "PENDING_HUMAN_REVIEW" });
    });
  },
};
