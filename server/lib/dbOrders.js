const crypto = require("crypto");
const { db } = require("./db");
const { calculateShipping } = require("./dbShipping");
const { calculateTaxSync } = require("./commercialIntegrations");
const { createPaymentSession } = require("./dbPayments");

function orderNumber() {
  return `BZ-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function createOrderFromCart(userId, { countryCode = "DE", currency = "EUR", shippingAddress = {} } = {}) {
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

  for (const item of items) {
    if (item.quantity > item.stock) {
      return { error: `Insufficient stock: ${item.sku}`, status: 409 };
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price_eur * item.quantity, 0);
  const weight = items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0);
  const shipping = calculateShipping(countryCode, weight, subtotal);
  const taxInfo = calculateTaxSync(countryCode, subtotal, shipping);
  const tax =
    taxInfo.tax ??
    Number(((subtotal + shipping) * (taxInfo.rate ?? 0.19)).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const number = orderNumber();

  const orderId = db.transaction(() => {
    const created = db
      .prepare(`
        INSERT INTO orders(
          order_number, user_id, country_code, currency, subtotal, shipping, tax, total, shipping_address
        ) VALUES(?,?,?,?,?,?,?,?,?)
      `)
      .run(
        number,
        userId,
        countryCode,
        currency,
        subtotal,
        shipping,
        tax,
        total,
        JSON.stringify(shippingAddress || {})
      );

    for (const item of items) {
      db.prepare(`
        INSERT INTO order_items(order_id, product_id, sku, name, unit_price_eur, quantity)
        VALUES(?,?,?,?,?,?)
      `).run(
        created.lastInsertRowid,
        item.product_id,
        item.sku,
        item.name,
        item.price_eur,
        item.quantity
      );
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cart.id);
    return created.lastInsertRowid;
  })();

  return {
    orderId,
    orderNumber: number,
    subtotal,
    shipping,
    tax,
    total,
    currency,
    status: "pending_payment",
  };
}

async function createOrderFromCartWithPayment(userId, options) {
  const result = createOrderFromCart(userId, options);
  if (result.error) return result;
  const payment = await createPaymentSession({
    orderNumber: result.orderNumber,
    total: result.total,
    currency: result.currency,
  });
  return { ...result, payment };
}

module.exports = {
  createOrderFromCart,
  createOrderFromCartWithPayment,
};
