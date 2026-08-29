/**
 * Part 8 — Cart service (PIM-authoritative pricing, server-side validation)
 */
const crypto = require("crypto");
const { db } = require("../db");
const productCore = require("../pim/productCore");
const catalogReadService = require("../storefront/catalogReadService");
const { isProductVisibleOnStorefront } = require("../storefront/storefrontVisibility");
const {
  validateQuantity,
  detectPriceTampering,
  computeLineTotal,
  validateCartItemCount,
} = require("./commerceValidation");
const { assertCustomerResourceAccess } = require("./commerceGuards");
const { logSecurityEvent } = require("../securityLog");
const { MAX_CART_ITEMS } = require("../../core/commerceConstants");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function resolveAuthoritativePrice(productId, variantId) {
  const product = productCore.getProduct(productId);
  if (!product) {
    const bySku = productCore.listProducts({ limit: 500 }).find((p) => p.sku === productId || p.id === productId);
    if (!bySku) return { error: "product_not_found", status: 404 };
    return buildPriceSnapshot(bySku, variantId);
  }
  return buildPriceSnapshot(product, variantId);
}

function buildPriceSnapshot(product, variantId) {
  if (!isProductVisibleOnStorefront(product)) {
    return { error: "product_not_purchasable", status: 403, code: "not_visible" };
  }

  let price = Number(product.price) || 0;
  let stock = Number(product.stock) || 0;
  let resolvedVariantId = variantId || null;

  if (variantId) {
    const variant = (product.variants || []).find((v) => v.id === variantId || v.sku === variantId);
    if (!variant) return { error: "variant_not_found", status: 404 };
    price += Number(variant.price_delta) || 0;
    stock = Number(variant.stock) ?? stock;
    resolvedVariantId = variant.id;
  }

  return {
    productId: product.id,
    variantId: resolvedVariantId,
    sku: product.sku,
    title: product.title,
    priceSnapshot: Math.max(0, price),
    currency: product.currency || "EUR",
    stock,
    purchasable: stock > 0,
    categoryId: product.category || product.taxonomy_category_id,
  };
}

function createCart({ customerId, sessionId, country = "DE", currency = "EUR" } = {}) {
  const id = newId("cart");
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.prepare(`
    INSERT INTO commerce_carts(id, customer_id, session_id, country, currency, status, expires_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `).run(id, customerId || null, sessionId || null, String(country).toUpperCase(), currency, expiresAt);
  return getCart(id);
}

function getCart(cartId, { customerId, req } = {}) {
  const cart = db.prepare("SELECT * FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cart) return { error: "cart_not_found", status: 404 };

  const access = assertCustomerResourceAccess({
    resourceCustomerId: cart.customer_id,
    requestCustomerId: customerId,
    resourceType: "cart",
    req,
  });
  if (access?.blocked && cart.customer_id) return access;

  const items = db.prepare("SELECT * FROM commerce_cart_items WHERE cart_id = ?").all(cartId);
  const validatedItems = [];
  let subtotal = 0;

  for (const row of items) {
    const auth = resolveAuthoritativePrice(row.product_id, row.variant_id);
    if (auth.error) continue;
    const line = {
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      quantity: row.quantity,
      priceSnapshot: auth.priceSnapshot,
      currency: auth.currency,
      sku: auth.sku,
      title: auth.title,
      stock: auth.stock,
      purchasable: auth.purchasable,
      lineTotal: computeLineTotal(auth.priceSnapshot, row.quantity),
      metadata: JSON.parse(row.metadata_json || "{}"),
    };
    subtotal += line.lineTotal;
    validatedItems.push(line);
  }

  return {
    cart: {
      id: cart.id,
      customerId: cart.customer_id,
      sessionId: cart.session_id,
      country: cart.country,
      currency: cart.currency,
      status: cart.status,
      createdAt: cart.created_at,
      expiresAt: cart.expires_at,
    },
    items: validatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    itemCount: validatedItems.length,
    maxItems: MAX_CART_ITEMS,
  };
}

function addItem(cartId, { productId, variantId, quantity, clientPrice, metadata, customerId, req } = {}) {
  const cartRow = db.prepare("SELECT * FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cartRow) return { error: "cart_not_found", status: 404 };

  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: customerId,
    resourceType: "cart",
    req,
  });
  if (access?.blocked && cartRow.customer_id) return access;

  const qtyCheck = validateQuantity(quantity);
  if (!qtyCheck.ok) return { error: qtyCheck.code, message: qtyCheck.message, status: 400 };

  const auth = resolveAuthoritativePrice(productId, variantId);
  if (auth.error) return { error: auth.error, status: auth.status || 404 };

  if (clientPrice !== undefined) {
    const tamper = detectPriceTampering(clientPrice, auth.priceSnapshot);
    if (tamper.tampered) {
      logSecurityEvent({
        type: "price_tampering",
        success: false,
        path: req?.url,
        detail: { productId, clientPrice: tamper.clientPrice, serverPrice: tamper.serverPrice },
      });
      return { error: tamper.code, message: tamper.message, status: 400 };
    }
  }

  const existingCount = db.prepare("SELECT COUNT(*) n FROM commerce_cart_items WHERE cart_id = ?").get(cartId).n;
  const existing = db
    .prepare("SELECT * FROM commerce_cart_items WHERE cart_id = ? AND product_id = ? AND IFNULL(variant_id,'') = IFNULL(?, '')")
    .get(cartId, auth.productId, auth.variantId || "");

  if (!existing && existingCount >= MAX_CART_ITEMS) {
    return { error: "cart_too_large", status: 400 };
  }

  const newQty = (existing?.quantity || 0) + qtyCheck.quantity;
  const countCheck = validateCartItemCount(existing ? existingCount : existingCount + 1);
  if (!countCheck.ok) return { error: countCheck.code, status: 400 };

  if (newQty > auth.stock) {
    return { error: "insufficient_stock", message: "Not enough stock (dry-run validation)", status: 400, dryRun: true };
  }

  const itemId = existing?.id || newId("ci");
  if (existing) {
    db.prepare(`
      UPDATE commerce_cart_items SET quantity = ?, price_snapshot = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQty, auth.priceSnapshot, JSON.stringify(metadata || {}), itemId);
  } else {
    db.prepare(`
      INSERT INTO commerce_cart_items(id, cart_id, product_id, variant_id, quantity, price_snapshot, currency, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, cartId, auth.productId, auth.variantId, qtyCheck.quantity, auth.priceSnapshot, auth.currency, JSON.stringify(metadata || {}));
  }

  db.prepare("UPDATE commerce_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(cartId);
  return getCart(cartId, { customerId, req });
}

function updateItemQuantity(cartId, itemId, quantity, ctx = {}) {
  const qtyCheck = validateQuantity(quantity);
  if (!qtyCheck.ok) return { error: qtyCheck.code, status: 400 };

  const item = db.prepare("SELECT * FROM commerce_cart_items WHERE id = ? AND cart_id = ?").get(itemId, cartId);
  if (!item) return { error: "item_not_found", status: 404 };

  const auth = resolveAuthoritativePrice(item.product_id, item.variant_id);
  if (auth.error) return { error: auth.error, status: auth.status };

  if (qtyCheck.quantity > auth.stock) {
    return { error: "insufficient_stock", status: 400, dryRun: true };
  }

  db.prepare("UPDATE commerce_cart_items SET quantity = ?, price_snapshot = ? WHERE id = ?").run(
    qtyCheck.quantity,
    auth.priceSnapshot,
    itemId
  );
  return getCart(cartId, ctx);
}

function removeItem(cartId, itemId, ctx = {}) {
  db.prepare("DELETE FROM commerce_cart_items WHERE id = ? AND cart_id = ?").run(itemId, cartId);
  return getCart(cartId, ctx);
}

function validateStockForCheckout(cartId) {
  const cart = getCart(cartId);
  if (cart.error) return cart;

  const issues = [];
  for (const item of cart.items) {
    if (!item.purchasable || item.quantity > item.stock) {
      issues.push({
        productId: item.productId,
        sku: item.sku,
        requested: item.quantity,
        available: item.stock,
        code: "stock_unavailable",
      });
    }
  }

  return {
    ok: issues.length === 0,
    dryRun: true,
    reservation: false,
    issues,
    cart,
  };
}

function getDemoProductForCart() {
  const result = catalogReadService.listProducts({ q: "BZ-CORE", limit: 1 });
  const item = result.items?.[0];
  if (!item) return null;
  return { productId: item.id, sku: item.sku, price: item.price };
}

module.exports = {
  createCart,
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  resolveAuthoritativePrice,
  validateStockForCheckout,
  getDemoProductForCart,
};
