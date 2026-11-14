/**
 * Part 8 — Cart service (PIM-authoritative pricing, server-side validation)
 */
const crypto = require("crypto");
const { db } = require("../db");
const productService = require("../productService");
const catalogReadService = require("../storefront/catalogReadService");
const pathAdapter = require("./canonicalCommercePath");
const { isProductVisibleOnStorefront } = require("../storefront/storefrontVisibility");
const {
  validateQuantity,
  detectPriceTampering,
  computeLineTotal,
} = require("./commerceValidation");
const { assertCustomerResourceAccess } = require("./commerceGuards");
const { logSecurityEvent } = require("../securityLog");
const { isSalesEnabled } = require("../salesMode");
const pricing = require("./pricingIntegration");
const { MAX_CART_ITEMS } = require("../../core/commerceConstants");
const commerceCouponService = require("./commerceCouponService");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function resolveAuthoritativePrice(productId, variantId) {
  const product = productService.getProduct(productId);
  if (!product) {
    const bySku = productService.listProducts({ limit: 500 }).find((p) => p.sku === productId || p.id === productId);
    if (!bySku) return { error: "product_not_found", code: "PRODUCT_NOT_FOUND", status: 404 };
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
    purchasable: false,
    stockVerified: false,
    reserved: false,
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
  return getCart(id, { customerId: customerId || undefined });
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
  if (access?.blocked && cart.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  const items = db.prepare("SELECT * FROM commerce_cart_items WHERE cart_id = ?").all(cartId);
  const validatedItems = [];
  let subtotal = 0;

  for (const row of items) {
    const auth = resolveAuthoritativePrice(row.product_id, row.variant_id);
    if (auth.error) continue;
    const metadata = JSON.parse(row.metadata_json || "{}");
    const line = {
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      quantity: row.quantity,
      priceSnapshot: auth.priceSnapshot,
      unitPrice: auth.priceSnapshot,
      currency: auth.currency,
      sku: auth.sku,
      title: auth.title,
      stock: null,
      stockVerified: false,
      purchasable: false,
      reserved: false,
      vat: metadata.vat ?? null,
      snapshotVersion: metadata.snapshotVersion || null,
      productSnapshot: metadata.productSnapshot || null,
      lineTotal: computeLineTotal(auth.priceSnapshot, row.quantity),
      metadata,
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
      couponCode: cart.coupon_code || null,
      createdAt: cart.created_at,
      expiresAt: cart.expires_at,
    },
    items: validatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    itemCount: validatedItems.length,
    maxItems: MAX_CART_ITEMS,
    ...buildCouponTotals(cart.coupon_code, subtotal),
  };
}

function couponReasons(couponCode, input = {}) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const code = String(couponCode || "").trim();
  if (!code) {
    reasons.push("UNKNOWN");
    return reasons;
  }
  reasons.push("COUPON_UNVERIFIED");
  if (
    input.mock === true ||
    input.demo === true ||
    input.test === true ||
    input.source === "mock" ||
    input.source === "DEMO" ||
    /MOCK|DEMO|TEST|FAKE/i.test(code)
  ) {
    reasons.push("MOCK_COUPON");
  }
  try {
    const row = db.prepare("SELECT active, expires_at FROM coupons WHERE code = ?").get(code.toUpperCase());
    if (row?.expires_at && Number.isNaN(Date.parse(row.expires_at)) === false && new Date(row.expires_at) < new Date()) {
      reasons.push("COUPON_EXPIRED");
    }
    if (row && Number(row.active) === 0) reasons.push("COUPON_INACTIVE");
  } catch {
    reasons.push("UNKNOWN");
  }
  return reasons;
}

function buildCouponTotals(couponCode, _subtotal, input = {}) {
  const reasons = couponReasons(couponCode, input);
  const code = String(couponCode || "").trim();
  return {
    couponCode: code || null,
    discount: null,
    couponValid: false,
    couponApplied: false,
    couponStatus: code ? "BLOCKED" : "UNKNOWN",
    couponError: reasons[0] || "COUPON_UNVERIFIED",
    code: reasons[0] || "COUPON_UNVERIFIED",
    discountedSubtotal: null,
    taxBase: null,
    commercialTotal: null,
    callerFlagIgnored: true,
    reasons,
    purchased: false,
    orderCreated: false,
  };
}

function cartRefusal(code, reasons, extra = {}) {
  return {
    ok: false,
    code,
    error: code,
    reasons,
    status: code === "SALES_CLOSED" ? 403 : 409,
    stored: false,
    reserved: false,
    purchased: false,
    stockDecremented: false,
    purchasable: false,
    checkoutAllowed: false,
    live: false,
    callerFlagIgnored: true,
    ...extra,
  };
}

function cartBlockReasons(input = {}, product) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  reasons.push("ORDER_UNVERIFIED");
  const observed = input.stockObservedAt || input.observedAt;
  if (!observed || Number.isNaN(Date.parse(String(observed)))) reasons.push("STALE_STOCK");
  if (input.mock === true || input.demo === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_STOCK");
  }
  if (product) {
    const quote = pricing.quotePrice({
      productId: product.id,
      offerPrice: Number(product.price),
      supplierCost: pricing.readSupplierCost(product),
      currency: product.currency || "EUR",
    });
    if (!pricing.priceAcceptedForCheckout(quote)) reasons.push("PRICE_POLICY_BLOCKED");
  }
  return reasons;
}

function addItem(cartId, input = {}) {
  const { productId, variantId, quantity, clientPrice, customerId, req } = input;
  const cartRow = db.prepare("SELECT * FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cartRow) return { error: "cart_not_found", status: 404 };

  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: customerId,
    resourceType: "cart",
    req,
  });
  if (access?.blocked && cartRow.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  const qtyCheck = validateQuantity(quantity);
  if (!qtyCheck.ok) return { error: qtyCheck.code, message: qtyCheck.message, status: 400 };

  const overrides = pathAdapter.rejectClientOverrides(input);
  if (!overrides.ok) return overrides;

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

  const product = productService.getProduct(auth.productId);
  const reasons = cartBlockReasons(input, product);
  const existing = db
    .prepare("SELECT * FROM commerce_cart_items WHERE cart_id = ? AND product_id = ? AND IFNULL(variant_id,'') = IFNULL(?, '')")
    .get(cartId, auth.productId, auth.variantId || "");
  const sameKey = input.idempotencyKey
    ? db.prepare("SELECT id, quantity, metadata_json FROM commerce_cart_items WHERE cart_id = ?").all(cartId).some((row) => {
        try {
          return JSON.parse(row.metadata_json || "{}").idempotencyKey === input.idempotencyKey;
        } catch {
          return false;
        }
      })
    : false;
  if (existing || sameKey) {
    return cartRefusal("DUPLICATE_CART_ITEM", reasons.concat("DUPLICATE_CART_ITEM"), {
      duplicate: true,
      quantity: existing?.quantity ?? null,
    });
  }
  return cartRefusal(reasons[0] || "STOCK_UNVERIFIED", reasons, {
    productId: auth.productId,
    sku: auth.sku,
    priceSnapshot: auth.priceSnapshot,
  });
}

function updateItemQuantity(cartId, itemId, quantity, ctx = {}) {
  const qtyCheck = validateQuantity(quantity);
  if (!qtyCheck.ok) return { error: qtyCheck.code, status: 400 };

  const item = db.prepare("SELECT * FROM commerce_cart_items WHERE id = ? AND cart_id = ?").get(itemId, cartId);
  if (!item) return { error: "item_not_found", status: 404 };

  const before = item.quantity;
  return cartRefusal(isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED", cartBlockReasons(ctx), {
    quantity: before,
  });
}

function localCartClearResult(cart, extra = {}) {
  return {
    ...cart,
    localRowsCleared: true,
    saleOpened: false,
    purchased: false,
    checkoutCompleted: false,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    refundCreated: false,
    shipmentCreated: false,
    commercialDiscountApplied: false,
    idempotent: true,
    discount: null,
    discountedSubtotal: null,
    ...extra,
  };
}

function removeItem(cartId, itemId, ctx = {}) {
  const cartRow = db.prepare("SELECT id, customer_id FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cartRow) return { error: "cart_not_found", status: 404 };
  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "cart",
    req: ctx.req,
  });
  if (access?.blocked && cartRow.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }
  const before = db.prepare("SELECT id FROM commerce_cart_items WHERE id = ? AND cart_id = ?").get(itemId, cartId);
  if (before) {
    db.prepare("DELETE FROM commerce_cart_items WHERE id = ? AND cart_id = ?").run(itemId, cartId);
  }
  return localCartClearResult(getCart(cartId, ctx), { localRowCleared: Boolean(before), removedItemId: itemId });
}

function validateStockForCheckout(cartId) {
  const cart = getCart(cartId);
  if (cart.error) return cart;

  return {
    ok: false,
    code: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    checkoutAllowed: false,
    reservation: false,
    purchased: false,
    dryRun: true,
    issues: (cart.items || []).map((item) => ({
      productId: item.productId,
      sku: item.sku,
      requested: item.quantity,
      available: null,
      code: "STOCK_UNVERIFIED",
    })),
    reasons: ["SALES_CLOSED", "STOCK_UNVERIFIED", "ORDER_UNVERIFIED"],
    cart,
  };
}

function getDemoProductForCart() {
  const result = catalogReadService.listProducts({ limit: 1 });
  const item = result.items?.[0];
  if (!item) return null;
  return { productId: item.id, sku: item.sku, price: item.price };
}

function clearCart(cartId, ctx = {}) {
  const cartRow = db.prepare("SELECT * FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cartRow) return { error: "cart_not_found", status: 404 };

  const { assertCustomerResourceAccess } = require("./commerceGuards");
  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "cart",
    req: ctx.req,
  });
  if (access?.blocked && cartRow.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  db.prepare("DELETE FROM commerce_cart_items WHERE cart_id = ?").run(cartId);
  db.prepare("UPDATE commerce_carts SET coupon_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(cartId);
  return localCartClearResult(getCart(cartId, ctx));
}

function applyCoupon(cartId) {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, applied: false, stored: false, purchased: false, cartId: cartId || null };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, applied: false, stored: false, purchased: false, cartId: cartId || null };
}

function removeCoupon(cartId, ctx = {}) {
  const cartRow = db.prepare("SELECT * FROM commerce_carts WHERE id = ? AND status = 'active'").get(cartId);
  if (!cartRow) return { error: "cart_not_found", status: 404 };

  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "cart",
    req: ctx.req,
  });
  if (access?.blocked && cartRow.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  db.prepare("UPDATE commerce_carts SET coupon_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(cartId);
  const cart = getCart(cartId, ctx);
  return {
    ...cart,
    localFieldCleared: true,
    commercialDiscountApplied: false,
    orderCreated: false,
    paymentCreated: false,
    refundCreated: false,
    idempotent: true,
    discount: null,
    discountedSubtotal: null,
  };
}

function validateCouponForCart(cartId, body = {}, ctx = {}) {
  const cart = getCart(cartId, ctx);
  if (cart.error) return cart;

  const code = body.couponCode ?? body.code ?? cart.cart.couponCode;
  const validated = commerceCouponService.validateCouponRequest(
    { ...body, couponCode: code },
    cart.subtotal,
    ctx
  );
  if (!validated.ok && validated.error === "coupon_tampering") {
    return { ok: false, error: validated.error, code: validated.error, status: validated.status || 400, applied: false, discount: null, callerFlagIgnored: true };
  }
  const reasons = couponReasons(code, body);
  const refusal = reasons[0] || "COUPON_UNVERIFIED";
  return {
    ok: false,
    error: refusal,
    code: refusal,
    status: refusal === "SALES_CLOSED" ? 403 : 409,
    applied: false,
    discount: null,
    discountedSubtotal: null,
    purchased: false,
    callerFlagIgnored: true,
    idempotent: true,
    reasons,
  };
}

module.exports = {
  createCart,
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  validateCouponForCart,
  resolveAuthoritativePrice,
  validateStockForCheckout,
  getDemoProductForCart,
};
