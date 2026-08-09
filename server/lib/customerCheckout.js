const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CUSTOMER_CHECKOUT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function getTaxRate(countryCode) {
  const country = String(countryCode || "DE").toUpperCase();
  const row = db.prepare("SELECT rate FROM tax_rates WHERE country_code = ?").get(country);
  return row?.rate ?? 0.19;
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
    .prepare("SELECT * FROM shipping_methods WHERE country_code = ? ORDER BY price")
    .all(country);
}

function getCustomerProfile(userId) {
  const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  const addresses = db
    .prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
  const wishlist = db
    .prepare("SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId)
    .map((row) => row.product_id);
  return { user, addresses, wishlist };
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
  return { address: db.prepare("SELECT * FROM addresses WHERE id = ?").get(info.lastInsertRowid) };
}

function deleteAddress(userId, addressId) {
  db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(addressId, userId);
  return { ok: true };
}

function addWishlistItem(userId, productId) {
  db.prepare("INSERT OR IGNORE INTO wishlists(user_id, product_id) VALUES(?,?)").run(
    userId,
    String(productId)
  );
  return { ok: true };
}

function removeWishlistItem(userId, productId) {
  db.prepare("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?").run(
    userId,
    String(productId)
  );
  return { ok: true };
}

function createReview(userId, body = {}) {
  const productId = String(body.productId || "");
  const rating = Number(body.rating);
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating 1-5 required", status: 400 };
  }
  const info = db
    .prepare("INSERT INTO reviews(user_id, product_id, rating, title, body) VALUES(?,?,?,?,?)")
    .run(userId, productId, rating, body.title || "", body.body || "");
  return { id: info.lastInsertRowid, status: "pending" };
}

function listApprovedReviews(productId) {
  return db
    .prepare(
      `SELECT rating, title, body, created_at
       FROM reviews
       WHERE product_id = ? AND status = 'approved'
       ORDER BY id DESC`
    )
    .all(String(productId));
}

function validateCouponCode(code, subtotal) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) return { error: "Coupon code required", status: 400 };
  const coupon = db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").get(normalized);
  if (!coupon) return { error: "Coupon not found", status: 404 };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: "Coupon expired", status: 400 };
  }
  if (Number(subtotal) < coupon.min_order) {
    return { error: `Minimum order ${coupon.min_order}`, status: 400 };
  }
  const discount =
    coupon.type === "percent"
      ? Number(((Number(subtotal) * coupon.value) / 100).toFixed(2))
      : Math.min(coupon.value, Number(subtotal));
  return {
    valid: true,
    code: coupon.code,
    discount,
    type: coupon.type,
    value: coupon.value,
  };
}

function saveCheckoutDraft(userId, body = {}) {
  db.prepare(
    `INSERT INTO checkout_drafts(user_id, address_id, country_code, currency, shipping_method, coupon_code, notes)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       address_id = excluded.address_id,
       country_code = excluded.country_code,
       currency = excluded.currency,
       shipping_method = excluded.shipping_method,
       coupon_code = excluded.coupon_code,
       notes = excluded.notes,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    userId,
    body.addressId || null,
    (body.countryCode || "DE").toUpperCase(),
    body.currency || "EUR",
    body.shippingMethod || "standard",
    body.couponCode || "",
    body.notes || ""
  );
  return { ok: true };
}

function getCheckoutDraft(userId) {
  return db.prepare("SELECT * FROM checkout_drafts WHERE user_id = ?").get(userId) || {};
}

function calculateCheckoutQuote(body = {}) {
  const subtotal = Number(body.subtotal || 0);
  const country = String(body.countryCode || "DE").toUpperCase();
  const currency = resolveCurrency(country, body.currency);
  const method = db
    .prepare("SELECT * FROM shipping_methods WHERE country_code = ? AND code = ?")
    .get(country, body.shippingMethod || "standard");
  const shipping = method ? (subtotal >= method.free_from ? 0 : method.price) : 9.99;

  let discount = 0;
  if (body.couponCode) {
    const result = validateCouponCode(body.couponCode, subtotal);
    if (result.valid) discount = result.discount;
  }

  const net = Math.max(0, subtotal - discount);
  const taxRate = getTaxRate(country);
  const tax = Number((net * taxRate).toFixed(2));
  const total = Number((net + shipping + tax).toFixed(2));

  return {
    subtotal,
    discount: Number(discount.toFixed(2)),
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

function markNotificationRead(userId, notificationId) {
  db.prepare(
    "UPDATE notifications SET read_at = CURRENT_TIMESTAMP, status = 'read' WHERE id = ? AND user_id = ?"
  ).run(notificationId, userId);
  return { ok: true };
}

function listReviewsAdmin() {
  return db.prepare("SELECT * FROM reviews ORDER BY id DESC").all();
}

function updateReviewStatus(reviewId, status) {
  const next = status === "approved" ? "approved" : "rejected";
  db.prepare("UPDATE reviews SET status = ? WHERE id = ?").run(next, reviewId);
  return { ok: true, status: next };
}

function listCouponsAdmin() {
  return db.prepare("SELECT * FROM coupons ORDER BY code").all();
}

function createCouponAdmin(body = {}) {
  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  if (!code) return { error: "Coupon code required", status: 400 };
  db.prepare(
    "INSERT INTO coupons(code, type, value, min_order, expires_at) VALUES(?,?,?,?,?)"
  ).run(
    code,
    body.type || "percent",
    Number(body.value),
    Number(body.minOrder || 0),
    body.expiresAt || null
  );
  return { ok: true, code };
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
