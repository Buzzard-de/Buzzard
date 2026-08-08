const fs = require("fs");
const path = require("path");
const {
  login,
  logout,
  requireCustomer,
  extractToken,
  createSession,
  createResetToken,
  consumeResetToken,
} = require("../lib/customerAuth");
const customerStore = require("../lib/customerStore");
const fulfillmentStore = require("../lib/fulfillmentStore");
const { logAudit } = require("../lib/audit");

const ordersFile = path.join(__dirname, "..", "data", "orders.json");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readOrders() {
  if (!fs.existsSync(ordersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function sanitizeOrder(order) {
  const clone = { ...order };
  delete clone.paymentTransactionId;
  clone.shipments = fulfillmentStore
    .listShipmentsForOrder(order.orderNumber)
    .map(fulfillmentStore.sanitizeShipment);
  const tracked = clone.shipments.find((s) => s.trackingNumber);
  if (tracked) {
    clone.trackingNumber = tracked.trackingNumber;
    clone.trackingCarrier = tracked.carrier;
  }
  return clone;
}

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
        userEmail: result.customer.email,
        action: "register",
        entityType: "customer",
        entityId: result.customer.id,
        field: null,
        oldValue: null,
        newValue: result.customer.id,
      });

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
      return res.json({ success: true, user: customerStore.publicUser(updated) });
    });

    app.get("/api/account/addresses", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      return res.json({ success: true, addresses: customerStore.listAddresses(session.customerId) });
    });

    app.post("/api/account/addresses", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const address = customerStore.upsertAddress(session.customerId, req.body || {});
      if (!address) return res.status(400).json({ success: false, errorKey: "account.address.invalid" });
      return res.status(201).json({ success: true, address });
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
      const orders = readOrders()
        .filter((o) => o.customerId === session.customerId || o.customer?.email === customer?.email)
        .map(sanitizeOrder)
        .reverse();
      return res.json({ success: true, orders });
    });

    app.get("/api/account/orders/:orderNumber", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const customer = customerStore.findById(session.customerId);
      const order = readOrders().find((o) => o.orderNumber === req.params.orderNumber);
      if (!order) return res.status(404).json({ success: false, errorKey: "account.order.notFound" });
      const owns =
        order.customerId === session.customerId || order.customer?.email === customer?.email;
      if (!owns) return res.status(403).json({ success: false, errorKey: "account.auth.forbidden" });
      return res.json({ success: true, order: sanitizeOrder(order) });
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
      return res.json({ success: true, preferences: customer?.preferences || {} });
    });

    app.put("/api/account/preferences", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const preferences = customerStore.updatePreferences(session.customerId, req.body || {});
      return res.json({ success: true, preferences });
    });

    app.get("/api/account/export", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const exportData = customerStore.exportCustomerData(session.customerId);
      if (!exportData) return res.status(404).json({ success: false, errorKey: "account.notFound" });
      logAudit({
        userId: session.customerId,
        userEmail: session.email,
        action: "export",
        entityType: "customer",
        entityId: session.customerId,
        field: null,
        oldValue: null,
        newValue: "data_export",
      });
      return res.json({ success: true, export: exportData });
    });

    app.post("/api/account/password-reset/request", (req, res) => {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const customer = customerStore.findByEmail(email);
      if (customer) {
        const reset = createResetToken(customer.id, req);
        if (reset.limited) {
          return res.status(429).json({ success: false, errorKey: "security.rateLimited" });
        }
        logAudit({
          userId: customer.id,
          userEmail: customer.email,
          action: "password_reset_request",
          entityType: "customer",
          entityId: customer.id,
          field: null,
          oldValue: null,
          newValue: "requested",
        });
        return res.json({
          success: true,
          message: "If the email exists, a reset link was generated.",
          resetToken: reset.token,
        });
      }
      return res.json({ success: true, message: "If the email exists, a reset link was generated." });
    });

    app.post("/api/account/password-reset/confirm", (req, res) => {
      const { token, password, passwordConfirm } = req.body || {};
      if (!password || password.length < 8) {
        return res.status(400).json({ success: false, errorKey: "account.register.weakPassword" });
      }
      if (password !== passwordConfirm) {
        return res.status(400).json({ success: false, errorKey: "account.register.passwordMismatch" });
      }
      const customerId = consumeResetToken(token);
      if (!customerId) return res.status(400).json({ success: false, errorKey: "account.passwordReset.invalidToken" });
      customerStore.updatePassword(customerId, password);
      return res.json({ success: true });
    });

    app.post("/api/account/deletion-request", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const requestedAt = customerStore.requestDeletion(session.customerId);
      return res.json({ success: true, requestedAt });
    });
  },
};
