const { db } = require("./db");
const { assertSalesEnabled } = require("./salesMode");

function createOrderFromCart(userId, { countryCode, shippingAddress = {} } = {}) {
  const blocked = assertSalesEnabled();
  if (blocked) return blocked;
  const destination = String(countryCode || shippingAddress.country || "").trim().toUpperCase();
  if (!destination) {
    return {
      error: "DESTINATION_UNKNOWN",
      code: "DESTINATION_UNKNOWN",
      status: 409,
      orderCreated: false,
      shippingCost: null,
      commercialEligibility: "BLOCKED",
    };
  }

  const cart = db.prepare("SELECT id FROM carts WHERE user_id = ?").get(userId);
  if (!cart) return { error: "Cart is empty", status: 400 };

  const items = db
    .prepare(`
      SELECT ci.product_id, ci.quantity, p.sku, p.name, p.price_eur, p.weight_kg, p.stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = ?
    `)
    .all(cart.id);

  if (!items.length) return { error: "Cart is empty", status: 400 };

  return {
    ok: false,
    error: "STOCK_UNVERIFIED",
    code: "STOCK_UNVERIFIED",
    status: 409,
    orderCreated: false,
    purchased: false,
    stockDecremented: false,
    live: false,
    reasons: ["STOCK_UNVERIFIED", "SUPPLIER_COST_UNVERIFIED", "PAYMENT_UNVERIFIED"],
  };
}

async function createOrderFromCartWithPayment(userId, options) {
  const result = createOrderFromCart(userId, options);
  return {
    ...result,
    payment: null,
    paymentCreated: false,
    customerNotified: false,
    orderCreated: false,
  };
}

module.exports = {
  createOrderFromCart,
  createOrderFromCartWithPayment,
};
