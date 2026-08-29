/**
 * Part 8 — Commerce Core API (checkout hardening, dry-run, readiness)
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { createRateLimiter, getClientIp } = require("../lib/security");
const { isCommerceCoreEnabled } = require("../core/commerceConstants");
const commerce = require("../lib/commerce");
const { logAuditFromRequest } = require("../lib/coreAudit");

const cartRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 120, keyPrefix: "commerce-cart:" });
const checkoutRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 30, keyPrefix: "commerce-checkout:" });
const orderRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 10, keyPrefix: "commerce-order:" });
const readinessRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: "commerce-readiness:" });

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = { userId: session.userId, email: session.email, role: session.role };
  return session;
}

function rateLimit(req, res, limiter) {
  if (limiter(req, { key: getClientIp(req) })) {
    res.status(429).json({ success: false, errorKey: "security.rateLimited" });
    return false;
  }
  return true;
}

function parseBody(req) {
  return req.body || {};
}

module.exports = {
  register(app) {
    if (!isCommerceCoreEnabled()) {
      console.log("Commerce Core disabled (BUZZARD_COMMERCE_CORE=0)");
      return;
    }

    app.get("/api/health/commerce", (_req, res) => {
      res.json({ success: true, health: commerce.commerceReadiness.getCommerceHealth() });
    });

    app.get("/api/commerce/status", (_req, res) => {
      res.json({
        success: true,
        flags: commerce.getEffectiveFlags(),
        safety: commerce.getSalesSafetyStatus(),
        salesEnabled: false,
      });
    });

    app.get("/api/commerce/readiness", (_req, res) => {
      res.json({ success: true, readiness: commerce.commerceReadiness.runReadinessGate() });
    });

    app.post("/api/commerce/cart", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const cart = commerce.cartService.createCart({
        customerId: body.customerId,
        sessionId: body.sessionId,
        country: body.country,
        currency: body.currency,
      });
      res.json({ success: true, ...cart });
    });

    app.get("/api/commerce/cart/:id", (req, res) => {
      const cart = commerce.cartService.getCart(req.params.id, { customerId: req.query.customerId, req });
      if (cart.error) return res.status(cart.status || 400).json({ success: false, errorKey: cart.error, ...cart });
      res.json({ success: true, ...cart });
    });

    app.post("/api/commerce/cart/:id/items", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.addItem(req.params.id, { ...body, req });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.patch("/api/commerce/cart/:id/items/:itemId", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.updateItemQuantity(
        req.params.id,
        req.params.itemId,
        body.quantity,
        { customerId: body.customerId, req }
      );
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.delete("/api/commerce/cart/:id/items/:itemId", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.removeItem(req.params.id, req.params.itemId, {
        customerId: body.customerId || req.query?.customerId,
        req,
      });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.post("/api/commerce/cart/:id/clear", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.clearCart(req.params.id, { customerId: body.customerId, req });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.post("/api/commerce/cart/:id/validate", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const cart = commerce.cartService.getCart(req.params.id, { customerId: body.customerId, req });
      if (cart.error) return res.status(cart.status || 400).json({ success: false, errorKey: cart.error });
      const stock = commerce.cartService.validateStockForCheckout(req.params.id);
      res.json({
        success: true,
        ok: stock.ok,
        issues: stock.issues,
        dryRun: stock.dryRun,
        itemCount: cart.itemCount,
        subtotal: cart.subtotal,
        discount: cart.discount,
        couponCode: cart.cart?.couponCode,
      });
    });

    app.post("/api/commerce/coupons/validate", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const cartId = body.cartId;
      if (cartId) {
        const result = commerce.cartService.validateCouponForCart(cartId, body, {
          customerId: body.customerId,
          req,
        });
        if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error });
        return res.json({ success: true, ...result });
      }
      const subtotal = Number(body.subtotal) || 0;
      const commerceCouponService = require("../lib/commerce/commerceCouponService");
      const validated = commerceCouponService.validateCouponRequest(body, subtotal, { req });
      if (!validated.ok) return res.status(validated.status || 400).json({ success: false, errorKey: validated.error });
      res.json({ success: true, ok: true, ...validated });
    });

    app.post("/api/commerce/cart/:id/coupon", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.applyCoupon(req.params.id, { ...body, req });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.delete("/api/commerce/cart/:id/coupon", (req, res) => {
      if (!rateLimit(req, res, cartRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.cartService.removeCoupon(req.params.id, {
        customerId: body.customerId || req.query?.customerId,
        req,
      });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.get("/api/commerce/shipping/methods", (_req, res) => {
      res.json({ success: true, methods: commerce.shippingProvider.listMethods() });
    });

    app.get("/api/commerce/checkout/:id", (req, res) => {
      const checkout = commerce.checkoutService.getCheckout(req.params.id, {
        customerId: req.query.customerId,
        req,
      });
      if (checkout.error) return res.status(checkout.status || 404).json({ success: false, errorKey: checkout.error });
      res.json({ success: true, checkout });
    });

    app.post("/api/commerce/checkout/start", (req, res) => {
      if (!rateLimit(req, res, checkoutRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.checkoutService.startCheckout({ ...body, req });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, checkout: result });
    });

    app.post("/api/commerce/checkout/:id/validate", (req, res) => {
      if (!rateLimit(req, res, checkoutRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.checkoutService.validateCheckout(req.params.id, body, {
        customerId: body.customerId,
        req,
      });
      if (result.error) return res.status(result.status || 400).json({ success: false, errorKey: result.error, ...result });
      res.json({ success: true, ...result });
    });

    app.post("/api/commerce/checkout/:id/complete", (req, res) => {
      if (!rateLimit(req, res, orderRateLimit)) return;
      const body = parseBody(req);
      const result = commerce.checkoutService.completeCheckout(req.params.id, body, {
        customerId: body.customerId,
        idempotencyKey: body.idempotencyKey || req.headers["idempotency-key"],
        req,
      });
      if (result.error || result.blocked) {
        return res.status(result.status || 403).json({ success: false, errorKey: result.error || result.code, ...result });
      }
      res.json({ success: true, ...result });
    });

    app.post("/api/commerce/checkout/attempt", (req, res) => {
      if (!rateLimit(req, res, readinessRateLimit)) return;
      const body = parseBody(req);
      const demo = commerce.cartService.getDemoProductForCart();
      if (!demo) return res.status(503).json({ success: false, errorKey: "demo_product_unavailable" });

      const cart = commerce.cartService.createCart({ sessionId: body.sessionId || "readiness-test" });
      commerce.cartService.addItem(cart.cart.id, {
        productId: demo.productId,
        quantity: 1,
        req,
      });

      const checkout = commerce.checkoutService.startCheckout({
        cartId: cart.cart.id,
        orderType: body.orderType || "COMMERCIAL",
        req,
      });

      const validated = checkout.error
        ? { error: checkout.error }
        : commerce.checkoutService.validateCheckout(checkout.id, {
            billingAddress: { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" },
            shippingAddress: { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" },
          }, { req });

      const completed = checkout.error
        ? { error: checkout.error, code: checkout.error }
        : commerce.checkoutService.completeCheckout(checkout.id, {
            orderType: "COMMERCIAL",
            idempotencyKey: body.idempotencyKey || `attempt-${Date.now()}`,
          }, { req });

      res.json({
        success: true,
        blocked: Boolean(completed.error || completed.blocked || checkout.error),
        phase: checkout.error ? "start" : completed.error ? "complete" : "done",
        code: checkout.error || completed.error || completed.code,
        validated: validated.error ? { error: validated.error } : { state: validated.state },
        completed: completed.error
          ? { error: completed.error, code: completed.code }
          : { orderType: completed.order?.orderType, commercial: completed.commercial },
        commercialOrders: commerce.orderService.getCommercialOrderCount(),
        realPayment: false,
        supplierOrders: 0,
        salesEnabled: commerce.getSalesSafetyStatus().salesEnabled,
      });
    });

    app.get("/api/commerce/orders/:id", (req, res) => {
      const order = commerce.orderService.getOrder(req.params.id, { customerId: req.query.customerId, req });
      if (order.error) return res.status(order.status || 404).json({ success: false, errorKey: order.error });
      res.json({ success: true, order });
    });

    app.post("/api/commerce/webhooks/:provider", (req, res) => {
      const rawBody = JSON.stringify(req.body || {});
      const result = commerce.webhookFoundation.handleWebhook({
        provider: req.params.provider,
        eventId: req.headers["x-event-id"] || `evt_${Date.now()}`,
        eventType: req.body?.type || "unknown",
        rawBody,
        signature: req.headers["x-signature"] || "",
        secret: process.env.COMMERCE_WEBHOOK_SECRET || "",
        req,
      });
      res.status(result.status || 200).json({ success: result.accepted !== false, ...result });
    });

    app.get("/api/admin/commerce/overview", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({
        success: true,
        health: commerce.commerceReadiness.getCommerceHealth(),
        readiness: commerce.commerceReadiness.runReadinessGate(),
        flags: commerce.getEffectiveFlags(),
        ordersByType: commerce.orderService.countOrdersByType(),
        goLiveRequests: commerce.goLiveApproval.listGoLiveRequests(5),
        salesActivation: commerce.goLiveApproval.canActivateSales(),
      });
    });

    app.get("/api/admin/commerce/readiness", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, readiness: commerce.commerceReadiness.runReadinessGate() });
    });

    app.get("/api/admin/commerce/security-events", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "security.read")) return;
      const { listSecurityEvents } = require("../lib/securityLog");
      const commerceTypes = new Set([
        "checkout_blocked",
        "payment_attempt_blocked",
        "order_creation_blocked",
        "price_tampering",
        "coupon_tampering",
        "quantity_tampering",
        "idempotency_conflict",
        "commerce_permission_denied",
        "go_live_blocked",
        "go_live_requested",
        "go_live_approved",
      ]);
      const events = listSecurityEvents(200).filter((e) => commerceTypes.has(e.type));
      res.json({ success: true, events });
    });

    app.post("/api/admin/commerce/go-live/request", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.configure")) return;
      const body = parseBody(req);
      const result = commerce.goLiveApproval.requestGoLive({
        requestedBy: req.adminUser.email,
        notes: body.notes,
      });
      logAuditFromRequest(req, { action: "commerce.go_live_request", resourceType: "commerce", resourceId: result.id });
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/commerce/go-live/:id/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.configure")) return;
      const result = commerce.goLiveApproval.approveGoLive({
        requestId: req.params.id,
        decidedBy: req.adminUser.email,
      });
      if (result.error) return res.status(result.status || 404).json({ success: false, errorKey: result.error });
      logAuditFromRequest(req, { action: "commerce.go_live_approve", resourceType: "commerce", resourceId: req.params.id });
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/commerce/go-live/:id/reject", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.configure")) return;
      const body = parseBody(req);
      const result = commerce.goLiveApproval.rejectGoLive({
        requestId: req.params.id,
        decidedBy: req.adminUser.email,
        reason: body.reason,
      });
      if (result.error) return res.status(result.status || 404).json({ success: false, errorKey: result.error });
      res.json({ success: true, ...result });
    });

    app.get("/api/admin/commerce/migration/legacy-pim", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, report: commerce.legacyPimMigration.runDryRunMigration() });
    });

    app.get("/api/admin/commerce/search-health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, search: commerce.productSearch.getSearchHealth() });
    });

    console.log("Commerce Core plugin loaded (SALES=0, dry-run checkout)");
  },
};
