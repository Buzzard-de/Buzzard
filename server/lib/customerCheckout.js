const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CUSTOMER_CHECKOUT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function getTaxRate(countryCode) {
  const country = String(countryCode || "DE").toUpperCase();
  const row = db.prepare("SELECT rate FROM tax_rates WHERE country_code = ?").get(country);
  return row?.rate ?? null;
}

function resolveCurrency(countryCode, currency) {
  if (currency) return currency;
  const country = String(countryCode || "DE").toUpperCase();
  const locale = db.prepare("SELECT currency FROM locales WHERE country_code = ? LIMIT 1").get(country);
  return locale?.currency || "EUR";
}

function listShippingMethods(countryCode) {
  const country = String(countryCode || "DE").toUpperCase();
  return db
    .prepare("SELECT country_code, code, name FROM shipping_methods WHERE country_code = ? ORDER BY code")
    .all(country)
    .map((row) => ({
      country_code: row.country_code,
      code: row.code,
      name: row.name,
      price: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
    }));
}

function getCustomerProfile(userId) {
  const id = String(userId ?? "").trim();
  if (!/^[1-9]\d{0,17}$/.test(id)) return null;
  const user = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(id);
  if (!user) return null;
  const addresses = db
    .prepare("SELECT id, country_code, city FROM addresses WHERE user_id = ? ORDER BY id DESC")
    .all(id)
    .map((row) => ({
      id: row.id,
      countryCode: row.country_code,
      city: row.city,
      phone: null,
      line1: null,
      postalCode: null,
      shippingVerified: false,
      delivered: false,
    }));
  const wishlist = db
    .prepare("SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(id)
    .map((row) => row.product_id);
  return {
    user: { id: user.id, name: user.name, role: user.role, email: null, phone: null },
    addresses,
    wishlist,
    shippingVerified: false,
    delivered: false,
    orderVerified: false,
    customerNotified: false,
  };
}

function normalizeAddressInput(body = {}) {
  const name =
    body.name ||
    [body.firstName, body.lastName].filter(Boolean).join(" ").trim() ||
    "";
  const line1 = body.line1 || body.street || "";
  const city = body.city || "";
  const postalCode = body.postalCode || body.postal_code || body.zip || "";
  const countryCode = (body.countryCode || body.country_code || body.country || "DE").toUpperCase();
  const phone = body.phone || "";
  return { name, line1, city, postalCode, countryCode, phone };
}

function createAddress(userId, body) {
  const address = normalizeAddressInput(body);
  if (!address.name || !address.line1 || !address.city || !address.postalCode || !address.countryCode) {
    return { error: "Complete address required", status: 400 };
  }
  const info = db
    .prepare(
      `INSERT INTO addresses(user_id, name, line1, city, postal_code, country_code, phone)
       VALUES(?,?,?,?,?,?,?)`
    )
    .run(
      userId,
      address.name,
      address.line1,
      address.city,
      address.postalCode,
      address.countryCode,
      address.phone
    );
  return {
    ok: false,
    stored: true,
    shippingVerified: false,
    delivered: false,
    orderCreated: false,
    customerNotified: false,
    address: { id: info.lastInsertRowid, countryCode: address.countryCode, phone: null },
  };
}

function deleteAddress(userId, addressId) {
  const info = db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(addressId, userId);
  return { ok: false, deleted: info.changes === 1, shipmentCancelled: false, delivered: false, customerNotified: false };
}

function updateAddress(userId, addressId, body) {
  const existing = db
    .prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?")
    .get(addressId, userId);
  if (!existing) return { error: "Address not found", status: 404 };
  const address = normalizeAddressInput(body);
  if (!address.name || !address.line1 || !address.city || !address.postalCode || !address.countryCode) {
    return { error: "Complete address required", status: 400 };
  }
  db.prepare(`
    UPDATE addresses
    SET name = ?, line1 = ?, city = ?, postal_code = ?, country_code = ?, phone = ?
    WHERE id = ? AND user_id = ?
  `).run(
    address.name,
    address.line1,
    address.city,
    address.postalCode,
    address.countryCode,
    address.phone,
    addressId,
    userId
  );
  return {
    ok: false,
    stored: true,
    shippingVerified: false,
    delivered: false,
    orderCreated: false,
    customerNotified: false,
    address: { id: existing.id, countryCode: address.countryCode, phone: null },
  };
}

function addWishlistItem(userId, productId) {
  db.prepare("INSERT OR IGNORE INTO wishlists(user_id, product_id) VALUES(?,?)").run(
    userId,
    String(productId)
  );
  return { ok: false, stored: true, reserved: false, orderCreated: false, customerNotified: false };
}

function removeWishlistItem(userId, productId) {
  db.prepare("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?").run(
    userId,
    String(productId)
  );
  return { ok: false, reserved: false, orderCreated: false, customerNotified: false };
}

function createReview(userId, body = {}) {
  const productId = String(body.productId || "");
  const rating = Number(body.rating);
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 400, published: false, verifiedPurchase: false };
  }
  const info = db
    .prepare("INSERT INTO reviews(user_id, product_id, rating, title, body, status) VALUES(?,?,?,?,?, 'pending')")
    .run(userId, productId, rating, "", "");
  return {
    ok: false,
    id: info.lastInsertRowid,
    status: "pending",
    published: false,
    verifiedPurchase: false,
    purchaseVerified: false,
    ratingApplied: false,
    rewardIssued: false,
    customerNotified: false,
    callerFlagIgnored: true,
  };
}

function listApprovedReviews() {
  return [];
}

function validateCouponCode(code, _subtotal, input = {}) {
  const text = String(code || "").trim();
  const reasons = [];
  if (!require("./salesMode").isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (!text) reasons.push("UNKNOWN");
  else reasons.push("COUPON_UNVERIFIED");
  if (input.mock === true || input.demo === true || input.source === "mock" || /MOCK|DEMO|TEST|FAKE/i.test(text)) {
    reasons.push("MOCK_COUPON");
  }
  const first = reasons[0] || "COUPON_UNVERIFIED";
  return {
    ok: false,
    valid: false,
    error: first,
    code: first,
    status: first === "SALES_CLOSED" ? 403 : 409,
    couponStatus: text ? "BLOCKED" : "UNKNOWN",
    discount: null,
    applied: false,
    commercial: false,
    callerFlagIgnored: true,
    reasons,
  };
}

function saveCheckoutDraft() {
  if (!require("./salesMode").isSalesEnabled()) {
    return { ok: false, code: "SALES_CLOSED", stored: false, couponApplied: false, orderCreated: false, status: 403 };
  }
  return { ok: false, code: "ORDER_UNVERIFIED", stored: false, couponApplied: false, orderCreated: false, status: 409 };
}

function getCheckoutDraft(userId) {
  return db.prepare("SELECT * FROM checkout_drafts WHERE user_id = ?").get(userId) || {};
}

function readSubtotal(value) {
  if (value == null) return { state: "missing" };
  if (typeof value === "string") {
    const text = value.trim();
    if (text === "" || text.toUpperCase() === "UNKNOWN") return { state: "missing" };
    if (!/^[+]?\d+(?:\.\d+)?$/.test(text)) return { state: "invalid" };
    value = Number(text);
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { state: "invalid" };
  return { state: "present", value: value === 0 ? 0 : value };
}

function blockedCheckoutQuote(code, status, extra = {}) {
  return {
    ok: false,
    status,
    code,
    subtotal: null,
    discount: null,
    tax: null,
    total: null,
    currency: null,
    commercialEligibility: "BLOCKED",
    couponApplied: false,
    orderCreated: false,
    paymentCreated: false,
    invented: false,
    quoteCreated: false,
    ...extra,
  };
}

function calculateCheckoutQuote(body = {}) {
  const parsed = readSubtotal(body.subtotal);
  if (parsed.state === "missing") return blockedCheckoutQuote("SUBTOTAL_UNKNOWN", "UNKNOWN");
  if (parsed.state !== "present") return blockedCheckoutQuote("INVALID_AMOUNT", "INVALID");
  const subtotal = parsed.value;
  if (!require("./salesMode").isSalesEnabled()) {
    return blockedCheckoutQuote("SALES_CLOSED", "BLOCKED", { subtotal });
  }
  const country = String(body.countryCode || "DE").toUpperCase();
  const currency = resolveCurrency(country, body.currency);
  const method = db
    .prepare("SELECT * FROM shipping_methods WHERE country_code = ? AND code = ?")
    .get(country, body.shippingMethod || "standard");
  if (!method || method.rate_verified !== 1) {
    return {
      ok: false,
      status: "SHIPPING_RATE_UNVERIFIED",
      code: "SHIPPING_RATE_UNVERIFIED",
      subtotal,
      shipping: null,
      tax: null,
      commercialEligibility: "BLOCKED",
      invented: false,
      quoteCreated: false,
      orderCreated: false,
    };
  }
  const shipping = method.price;

  const discount = null;
  const net = subtotal;
  const taxRate = getTaxRate(country);
  if (taxRate == null) {
    return { ok: false, status: "UNKNOWN", code: "VAT_UNKNOWN", shipping, tax: null, official: false, invented: false };
  }
  const tax = Number((net * taxRate).toFixed(2));
  const total = Number((net + shipping + tax).toFixed(2));

  return {
    subtotal,
    discount: null,
    couponApplied: false,
    couponStatus: body.couponCode ? "BLOCKED" : "UNKNOWN",
    shipping,
    tax,
    vatAmount: tax,
    total,
    currency,
    taxRate,
  };
}

function listNotifications(userId) {
  return db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
}

function markNotificationRead() {
  return { ok: false, read: false, sent: false, customerNotified: false, delivery: "BLOCKED_EXTERNAL", code: "DELIVERY_BLOCKED" };
}

function listReviewsAdmin() {
  return db.prepare("SELECT * FROM reviews ORDER BY id DESC").all();
}

const reviewModerationAttempts = new Set();

function updateReviewStatus(reviewId, status, body = {}) {
  const id = String(reviewId ?? "").trim();
  const review = /^[1-9]\d{0,17}$/.test(id)
    ? db.prepare("SELECT id, status FROM reviews WHERE id = ?").get(id)
    : null;
  if (!review) {
    return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 404, published: false, verifiedPurchase: false, customerNotified: false };
  }
  const duplicate = reviewModerationAttempts.has(id);
  reviewModerationAttempts.add(id);
  const requested = String(status || body.status || "");
  const wantsPublish = requested === "approved" || body.approved === true || body.verified === true || body.live === true;
  if (requested === "rejected" && !wantsPublish) {
    db.prepare("UPDATE reviews SET status = 'rejected' WHERE id = ?").run(id);
    return {
      ok: false,
      code: "WITHDRAWN",
      status: 200,
      published: false,
      verifiedPurchase: false,
      purchaseVerified: false,
      ratingApplied: false,
      rewardIssued: false,
      customerNotified: false,
      moderated: true,
      duplicate,
      idempotent: true,
      callerFlagIgnored: true,
    };
  }
  return {
    ok: false,
    error: "ORDER_UNVERIFIED",
    code: "ORDER_UNVERIFIED",
    status: 409,
    published: false,
    verifiedPurchase: false,
    purchaseVerified: false,
    ratingApplied: false,
    rewardIssued: false,
    customerNotified: false,
    duplicate,
    idempotent: true,
    callerFlagIgnored: true,
    reasons: ["ORDER_UNVERIFIED", "SALES_CLOSED"],
  };
}

function listCouponsAdmin() {
  return db.prepare("SELECT * FROM coupons ORDER BY code").all();
}

function createCouponAdmin() {
  if (!require("./salesMode").isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, commercial: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, stored: false, commercial: false, callerFlagIgnored: true };
}

function getCustomerCheckoutStatus() {
  return {
    version: "1.0.0",
    enabled: isEnabled(),
    totals: {
      coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
      shippingMethods: db.prepare("SELECT COUNT(*) n FROM shipping_methods").get().n,
      reviews: db.prepare("SELECT COUNT(*) n FROM reviews").get().n,
      pendingReviews: db.prepare("SELECT COUNT(*) n FROM reviews WHERE status = 'pending'").get().n,
      wishlists: db.prepare("SELECT COUNT(*) n FROM wishlists").get().n,
      notifications: db.prepare("SELECT COUNT(*) n FROM notifications").get().n,
      checkoutDrafts: db.prepare("SELECT COUNT(*) n FROM checkout_drafts").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  listShippingMethods,
  getCustomerProfile,
  createAddress,
  updateAddress,
  deleteAddress,
  addWishlistItem,
  removeWishlistItem,
  createReview,
  listApprovedReviews,
  validateCouponCode,
  saveCheckoutDraft,
  getCheckoutDraft,
  calculateCheckoutQuote,
  listNotifications,
  markNotificationRead,
  listReviewsAdmin,
  updateReviewStatus,
  listCouponsAdmin,
  createCouponAdmin,
  getCustomerCheckoutStatus,
};
