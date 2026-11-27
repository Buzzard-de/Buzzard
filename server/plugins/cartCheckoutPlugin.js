const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const { assertCommerceCredential } = require("../lib/commerce/commerceGuards");
const { assertSalesEnabled } = require("../lib/salesMode");
const cartCheckout = require("../lib/cartCheckout");

function requireCredential(req, res) {
  const gate = assertCommerceCredential(req);
  if (!gate || gate.blocked) {
    res.status(gate?.status || 401).json({ success: false, errorKey: gate?.code || "auth_required", error: "Authentication required" });
    return null;
  }
  return gate.identity;
}

function refuseWhileSalesLocked(res) {
  const blocked = assertSalesEnabled();
  if (!blocked) return false;
  res.status(blocked.status || 403).json({ error: blocked.error, code: blocked.code });
  return true;
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

  res.status(403).json({ error: "Admin access required" });
  return null;
}

module.exports = {
  register(app) {
    if (!cartCheckout.isEnabled()) {
      console.log("Cart checkout disabled (BUZZARD_CART_CHECKOUT=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    const { markLegacyCommerce } = require("../lib/legacyCommerce");

    app.post("/api/cart-checkout/carts", (req, res) => {
      markLegacyCommerce(res, req.originalUrl || req.url, "/api/commerce/cart");
      if (!requireCredential(req, res)) return;
      return res.status(201).json(cartCheckout.createCart(req.body || {}));
    });

    app.get("/api/cart-checkout/carts/:token", (req, res) => {
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.getCart(req.params.token);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/cart-checkout/carts/:token/items", (req, res) => {
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.addCartItem(req.params.token, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.patch("/api/cart-checkout/carts/:token/items/:sku", (req, res) => {
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.updateCartItem(req.params.token, req.params.sku, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/cart-checkout/carts/:token/coupon", (req, res) => {
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.applyCoupon(req.params.token, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/cart-checkout/shipping/:country", (req, res) => {
      return res.json(cartCheckout.listShippingRates(req.params.country));
    });

    app.post("/api/cart-checkout/sessions", (req, res) => {
      if (refuseWhileSalesLocked(res)) return;
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.createCheckoutSession(req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result);
    });

    app.post("/api/cart-checkout/sessions/:token/validate", (req, res) => {
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.validateCheckoutSession(req.params.token);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/cart-checkout/sessions/:token/complete", (req, res) => {
      if (refuseWhileSalesLocked(res)) return;
      if (!requireCredential(req, res)) return;
      const result = cartCheckout.completeCheckoutSession(req.params.token);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/cart-checkout/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(cartCheckout.getCartCheckoutOverview());
    });

    app.get("/api/admin/cart-checkout/carts", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(cartCheckout.listCarts());
    });

    app.get("/api/admin/cart-checkout/sessions", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(cartCheckout.listCheckoutSessions());
    });

    app.get("/api/admin/cart-checkout/coupons", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(cartCheckout.listCoupons());
    });

    app.get("/api/admin/cart-checkout/shipping-rates", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(cartCheckout.listShippingRatesAdmin());
    });
  },
};
