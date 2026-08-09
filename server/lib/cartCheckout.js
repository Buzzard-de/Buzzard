const crypto = require("crypto");
const { db } = require("./db");

const VAT_RATES = {
  DE: 19,
  AT: 20,
  FR: 20,
  IT: 22,
  ES: 21,
  BE: 21,
  NL: 21,
  PL: 23,
};

function isEnabled() {
  return process.env.BUZZARD_CART_CHECKOUT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function cartToken() {
  return crypto.randomUUID();
}

function vatRate(country) {
  return VAT_RATES[String(country || "DE").toUpperCase()] || 19;
}

function getActiveCart(token) {
  return db
    .prepare(`
      SELECT * FROM cc_carts
      WHERE token = ? AND status = 'active' AND expires_at > datetime('now')
    `)
    .get(token);
}

function computeTotals(cart) {
  const items = db.prepare("SELECT * FROM cc_cart_items WHERE cart_id = ?").all(cart.id);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  let discount = 0;

  if (cart.coupon) {
    const coupon = db.prepare("SELECT * FROM cc_coupons WHERE code = ? AND active = 1").get(cart.coupon);
    if (coupon && subtotal >= coupon.min_order) {
      discount =
        coupon.type === "percent" ? (subtotal * coupon.value) / 100 : Math.min(coupon.value, subtotal);
    }
  }

  const taxBase = Math.max(0, subtotal - discount);
  const tax = (taxBase * vatRate(cart.country)) / 100;

  return {
    items,
    subtotal,
    discount,
    shipping: 0,
    tax,
    total: taxBase + tax,
    currency: cart.currency,
    taxRate: vatRate(cart.country),
  };
}

function createCart(body = {}) {
  const token = cartToken();
  const result = db
    .prepare(`
      INSERT INTO cc_carts(token, customer_id, email, country, currency)
      VALUES(?,?,?,?,?)
    `)
    .run(
      token,
      body.customerId || body.customer_id || null,
      body.email || "",
      (body.country || "DE").toUpperCase(),
      body.currency || process.env.CC_DEFAULT_CURRENCY || "EUR"
    );

  return { cartToken: token, cartId: result.lastInsertRowid };
}

function getCart(token) {
  const cart = getActiveCart(token);
  if (!cart) return { error: "Cart not found", status: 404 };
  return { cart, ...computeTotals(cart) };
}

function addCartItem(token, body = {}) {
  const cart = getActiveCart(token);
  if (!cart) return { error: "Cart not found", status: 404 };
  if (!body.sku || Number(body.quantity) < 1) return { error: "Invalid item", status: 400 };

  db.prepare(`
    INSERT INTO cc_cart_items(cart_id, sku, title, qty, price, tax)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(cart_id, sku) DO UPDATE SET
      qty = qty + excluded.qty,
      price = excluded.price,
      title = excluded.title
  `).run(
    cart.id,
    body.sku,
    body.title || "",
    Number(body.quantity),
    Number(body.unitPrice || body.unit_price || 0),
    vatRate(cart.country)
  );

  return computeTotals(cart);
}

function updateCartItem(token, sku, body = {}) {
  const cart = getActiveCart(token);
  if (!cart) return { error: "Cart not found", status: 404 };

  const quantity = Number(body.quantity || 0);
  if (quantity <= 0) {
    db.prepare("DELETE FROM cc_cart_items WHERE cart_id = ? AND sku = ?").run(cart.id, sku);
  } else {
    db.prepare("UPDATE cc_cart_items SET qty = ? WHERE cart_id = ? AND sku = ?").run(
      quantity,
      cart.id,
      sku
    );
  }

  return computeTotals(cart);
}

function applyCoupon(token, body = {}) {
  const cart = getActiveCart(token);
  if (!cart) return { error: "Cart not found", status: 404 };

  const code = String(body.code || "").toUpperCase();
  const coupon = db.prepare("SELECT * FROM cc_coupons WHERE code = ? AND active = 1").get(code);
  if (!coupon) return { error: "Coupon invalid", status: 400 };

  const preview = computeTotals({ ...cart, coupon: code });
  if (preview.subtotal < coupon.min_order) {
    return { error: "Minimum order not reached", status: 400 };
  }

  db.prepare("UPDATE cc_carts SET coupon = ? WHERE id = ?").run(code, cart.id);
  return computeTotals({ ...cart, coupon: code });
}

function listShippingRates(country) {
  return db
    .prepare("SELECT * FROM cc_shipping_rates WHERE country = ? AND active = 1 ORDER BY price")
    .all(String(country || "DE").toUpperCase());
}

function createCheckoutSession(body = {}) {
  const cart = getActiveCart(body.cartToken || body.cart_token);
  if (!cart) return { error: "Cart not found", status: 404 };

  const totals = computeTotals(cart);
  const shippingRate = body.shippingId || body.shipping_id
    ? db
        .prepare("SELECT * FROM cc_shipping_rates WHERE id = ? AND country = ? AND active = 1")
        .get(body.shippingId || body.shipping_id, cart.country)
    : null;

  const shipping = shippingRate?.price || 0;
  const base = Math.max(0, totals.subtotal - totals.discount + shipping);
  const tax = (base * vatRate(cart.country)) / 100;
  const total = base + tax;
  const checkoutToken = cartToken();

  db.prepare(`
    INSERT INTO cc_checkout_sessions(
      token, cart_id, email, country, currency, shipping_id, payment_method,
      shipping_json, billing_json, subtotal, discount, shipping, tax, total
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    checkoutToken,
    cart.id,
    body.email || cart.email,
    cart.country,
    body.currency || cart.currency,
    body.shippingId || body.shipping_id || null,
    body.paymentMethod || body.payment_method || "card",
    JSON.stringify(body.shippingAddress || body.shipping_address || {}),
    JSON.stringify(body.billingAddress || body.billing_address || body.shippingAddress || body.shipping_address || {}),
    totals.subtotal,
    totals.discount,
    shipping,
    tax,
    total
  );

  return {
    checkoutToken,
    amount: total,
    currency: cart.currency,
    status: "open",
    next: "validate_then_create_payment_intent",
  };
}

function validateCheckoutSession(token) {
  const session = db.prepare("SELECT * FROM cc_checkout_sessions WHERE token = ?").get(token);
  if (!session) return { error: "Checkout not found", status: 404 };

  const errors = [];
  if (!session.email) errors.push("email");
  if (!session.shipping_id) errors.push("shipping");
  if (!session.payment_method) errors.push("payment");
  if (session.shipping_json === "{}") errors.push("address");

  return { valid: errors.length === 0, errors };
}

function completeCheckoutSession(token) {
  const session = db.prepare("SELECT * FROM cc_checkout_sessions WHERE token = ?").get(token);
  if (!session) return { error: "Checkout not found", status: 404 };

  db.prepare("UPDATE cc_checkout_sessions SET status = 'ready_for_payment' WHERE id = ?").run(session.id);

  return {
    ok: true,
    status: "ready_for_payment",
    amount: session.total,
    currency: session.currency,
    next: "v2.1 payment intent + v2.2 order",
  };
}

function getCartCheckoutOverview() {
  return {
    activeCarts: db.prepare("SELECT COUNT(*) n FROM cc_carts WHERE status = 'active'").get().n,
    openCheckouts: db
      .prepare("SELECT COUNT(*) n FROM cc_checkout_sessions WHERE status = 'open'")
      .get().n,
    readyForPayment: db
      .prepare("SELECT COUNT(*) n FROM cc_checkout_sessions WHERE status = 'ready_for_payment'")
      .get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM cc_coupons WHERE active = 1").get().n,
    shippingRates: db.prepare("SELECT COUNT(*) n FROM cc_shipping_rates WHERE active = 1").get().n,
    cartItems: db.prepare("SELECT COUNT(*) n FROM cc_cart_items").get().n,
  };
}

function listCarts() {
  return db
    .prepare(`
      SELECT c.*, COUNT(i.id) AS item_count, COALESCE(SUM(i.qty * i.price), 0) AS subtotal
      FROM cc_carts c
      LEFT JOIN cc_cart_items i ON i.cart_id = c.id
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT 200
    `)
    .all();
}

function listCheckoutSessions() {
  return db
    .prepare("SELECT * FROM cc_checkout_sessions ORDER BY id DESC LIMIT 200")
    .all();
}

function listCoupons() {
  return db.prepare("SELECT * FROM cc_coupons ORDER BY id DESC").all();
}

function listShippingRatesAdmin() {
  return db.prepare("SELECT * FROM cc_shipping_rates ORDER BY country, price").all();
}

function getCartCheckoutStatus() {
  const overview = getCartCheckoutOverview();
  return {
    version: "2.3.0",
    enabled: isEnabled(),
    totals: {
      activeCarts: overview.activeCarts,
      openCheckouts: overview.openCheckouts,
      readyForPayment: overview.readyForPayment,
      coupons: overview.coupons,
      shippingRates: overview.shippingRates,
      cartItems: overview.cartItems,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createCart,
  getCart,
  addCartItem,
  updateCartItem,
  applyCoupon,
  listShippingRates,
  createCheckoutSession,
  validateCheckoutSession,
  completeCheckoutSession,
  getCartCheckoutOverview,
  listCarts,
  listCheckoutSessions,
  listCoupons,
  listShippingRatesAdmin,
  getCartCheckoutStatus,
};
