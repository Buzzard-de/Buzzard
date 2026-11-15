const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const customerCheckout = require("../lib/customerCheckout");

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

  res.status(403).json({ error: "Admin access required" });
  return null;
}

function requireCustomer(req, res) {
  const bearer = extractToken(req);
  if (!bearer) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    req.user = verifyToken(bearer);
    return req.user;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

module.exports = {
  register(app) {
    if (!customerCheckout.isEnabled()) {
      console.log("Customer checkout disabled (BUZZARD_CUSTOMER_CHECKOUT=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/customer/shipping-methods/:country", (req, res) => {
      return res.json(customerCheckout.listShippingMethods(req.params.country));
    });

    app.get("/api/customer/profile", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const profile = customerCheckout.getCustomerProfile(req.user.sub);
      if (!profile) return res.status(404).json({ error: "UNKNOWN", email: null, phone: null });
      return res.json({ ...profile, email: null, phone: null, shippingVerified: false, delivered: false });
    });

    app.post("/api/customer/addresses", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.createAddress(req.user.sub, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(200).json({ ...result, shippingVerified: false, delivered: false, customerNotified: false });
    });

    app.patch("/api/customer/addresses/:id", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.updateAddress(req.user.sub, req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(200).json({ ...result, shippingVerified: false, delivered: false, customerNotified: false });
    });

    app.delete("/api/customer/addresses/:id", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.deleteAddress(req.user.sub, req.params.id);
      return res.status(200).json({ ...result, ok: false, shipmentCancelled: false, customerNotified: false });
    });

    app.post("/api/customer/wishlist/:productId", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.addWishlistItem(req.user.sub, req.params.productId);
      return res.status(200).json({ ...result, ok: false, reserved: false, orderCreated: false });
    });

    app.delete("/api/customer/wishlist/:productId", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.removeWishlistItem(req.user.sub, req.params.productId);
      return res.status(200).json({ ...result, ok: false, reserved: false, orderCreated: false });
    });

    app.post("/api/customer/reviews", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.createReview(req.user.sub, req.body || {});
      return res.status(result.status || 200).json({ ...result, published: false, verifiedPurchase: false, customerNotified: false });
    });

    app.get("/api/customer/products/:id/reviews", (req, res) => {
      return res.json(customerCheckout.listApprovedReviews(req.params.id));
    });

    app.post("/api/customer/coupons/validate", (req, res) => {
      const { code, subtotal } = req.body || {};
      const result = customerCheckout.validateCouponCode(code, subtotal);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.put("/api/customer/checkout/draft", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(customerCheckout.saveCheckoutDraft(req.user.sub, req.body || {}));
    });

    app.get("/api/customer/checkout/draft", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(customerCheckout.getCheckoutDraft(req.user.sub));
    });

    app.post("/api/customer/checkout/quote", (req, res) => {
      const result = customerCheckout.calculateCheckoutQuote(req.body || {});
      if (result.ok === false) return res.status(result.code === "SALES_CLOSED" ? 403 : 409).json(result);
      return res.json(result);
    });

    app.get("/api/customer/notifications", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(customerCheckout.listNotifications(req.user.sub));
    });

    app.post("/api/customer/notifications/:id/read", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerCheckout.markNotificationRead(req.user.sub, req.params.id);
      return res.status(200).json({ ...result, ok: false, read: false, customerNotified: false, delivery: "BLOCKED_EXTERNAL" });
    });

    app.get("/api/admin/customer-checkout/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerCheckout.getCustomerCheckoutStatus());
    });

    app.get("/api/admin/customer-checkout/reviews", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerCheckout.listReviewsAdmin());
    });

    app.patch("/api/admin/customer-checkout/reviews/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerCheckout.updateReviewStatus(req.params.id, req.body?.status, req.body || {});
      return res.status(result.status || 403).json({ ...result, published: false, verifiedPurchase: false, customerNotified: false });
    });

    app.get("/api/admin/customer-checkout/coupons", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerCheckout.listCouponsAdmin());
    });

    app.post("/api/admin/customer-checkout/coupons", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerCheckout.createCouponAdmin(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result);
    });
  },
};
