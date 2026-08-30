/**
 * Part 8 — Checkout state machine + validation pipeline
 */
const crypto = require("crypto");
const { db } = require("../db");
const cartService = require("./cartService");
const shippingProvider = require("./shippingProvider");
const taxProvider = require("./taxProvider");
const paymentService = require("./paymentService");
const orderService = require("./orderService");
const {
  rejectClientTotals,
  computeOrderTotals,
  validateAddress,
} = require("./commerceValidation");
const { assessCheckoutRisk } = require("./riskEngine");
const {
  assertCanCreateOrder,
  logCommerceBlock,
  resolveOrderType,
} = require("./commerceGuards");
const { withIdempotency } = require("./idempotency");
const { logSecurityEvent } = require("../securityLog");
const {
  CHECKOUT_STATE,
  canTransitionCheckout,
  ORDER_TYPE,
} = require("../../core/commerceConstants");
const { getEffectiveFlags } = require("./commerceFeatureFlags");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function parseJson(val, fallback = {}) {
  try {
    return JSON.parse(val || "{}");
  } catch {
    return fallback;
  }
}

function getCheckout(checkoutId, ctx = {}) {
  const row = db.prepare("SELECT * FROM commerce_checkouts WHERE id = ?").get(checkoutId);
  if (!row) return { error: "checkout_not_found", status: 404 };

  const { assertCustomerResourceAccess } = require("./commerceGuards");
  const access = assertCustomerResourceAccess({
    resourceCustomerId: row.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "checkout",
    req: ctx.req,
  });
  if (access?.blocked && row.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  return {
    id: row.id,
    cartId: row.cart_id,
    customerId: row.customer_id,
    state: row.state,
    orderType: row.order_type,
    billing: parseJson(row.billing_json),
    shipping: parseJson(row.shipping_json),
    totals: parseJson(row.totals_json),
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parseJson(row.metadata_json),
  };
}

function transitionCheckout(checkoutId, toState) {
  const row = db.prepare("SELECT state FROM commerce_checkouts WHERE id = ?").get(checkoutId);
  if (!row) return { error: "checkout_not_found", status: 404 };
  if (!canTransitionCheckout(row.state, toState)) {
    return { error: "illegal_state_transition", from: row.state, to: toState, status: 409 };
  }
  db.prepare("UPDATE commerce_checkouts SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(toState, checkoutId);
  return getCheckout(checkoutId);
}

function startCheckout({ cartId, customerId, orderType, idempotencyKey, req } = {}) {
  const flags = getEffectiveFlags();
  if (!flags.checkoutEnabled) {
    logCommerceBlock("checkout_blocked", { reason: "checkout_disabled" }, req);
    return { error: "checkout_disabled", status: 403 };
  }

  const resolved = resolveOrderType(orderType);
  if (resolved.blocked) {
    logCommerceBlock("checkout_blocked", { orderType, reason: resolved.code }, req);
    return { error: resolved.code, status: 403 };
  }

  const cart = cartService.getCart(cartId, { customerId, req });
  if (cart.error) return cart;
  if (!cart.items?.length) return { error: "cart_empty", status: 400 };

  const id = newId("chk");
  db.prepare(`
    INSERT INTO commerce_checkouts(id, cart_id, customer_id, state, order_type, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cartId, customerId || null, CHECKOUT_STATE.DRAFT, resolved.orderType, idempotencyKey || null);

  return getCheckout(id, { customerId, req });
}

function validateCheckout(checkoutId, body = {}, ctx = {}) {
  const checkout = getCheckout(checkoutId, ctx);
  if (checkout.error) return checkout;

  transitionCheckout(checkoutId, CHECKOUT_STATE.VALIDATING);

  const clientTotalsReject = rejectClientTotals(body.totals || body);
  if (!clientTotalsReject.ok) {
    logSecurityEvent({ type: "price_tampering", success: false, detail: { checkoutId, reason: "client_totals" } });
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    return { error: clientTotalsReject.code, status: 400 };
  }

  if (body.discount !== undefined || body.clientDiscount !== undefined || body.couponDiscount !== undefined) {
    logSecurityEvent({ type: "coupon_tampering", success: false, detail: { checkoutId, reason: "client_discount_field" } });
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    return { error: "coupon_tampering", status: 400 };
  }

  const stock = cartService.validateStockForCheckout(checkout.cartId);
  if (!stock.ok) {
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    logCommerceBlock("checkout_blocked", { checkoutId, reason: "stock", issues: stock.issues }, ctx.req);
    return { error: "stock_validation_failed", status: 400, issues: stock.issues, dryRun: true };
  }

  const billing = body.billingAddress || body.billing || {};
  const shippingAddr = body.shippingAddress || body.shipping || billing;
  const addrCheck = validateAddress(shippingAddr, { requireFields: true });
  if (!addrCheck.ok) {
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    return { error: "address_invalid", status: 400, details: addrCheck.errors };
  }

  const shipping = shippingProvider.calculateShipping({
    methodId: body.shippingMethod || "standard",
    country: shippingAddr.country || "DE",
    subtotal: stock.cart.discountedSubtotal ?? stock.cart.subtotal,
    itemCount: stock.cart.itemCount,
  });

  const tax = taxProvider.calculateTax({
    country: shippingAddr.country || "DE",
    subtotal: stock.cart.discountedSubtotal ?? stock.cart.subtotal,
  });
  if (!tax.ok) {
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    return { error: tax.code, status: 400 };
  }

  const totals = computeOrderTotals({
    items: stock.cart.items,
    shipping: shipping.price,
    taxRate: tax.rate,
    discount: stock.cart.discount || 0,
    currency: stock.cart.cart.currency,
  });

  const risk = assessCheckoutRisk({
    items: stock.cart.items,
    clientIp: ctx.req?.headers?.["x-forwarded-for"],
    sessionId: stock.cart.cart.sessionId,
    clientTotals: body.totals,
  });

  if (risk.blocked) {
    transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
    logCommerceBlock("checkout_blocked", { checkoutId, risk }, ctx.req);
    return { error: "risk_blocked", status: 403, risk };
  }

  db.prepare(`
    UPDATE commerce_checkouts SET
      billing_json = ?, shipping_json = ?, totals_json = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    JSON.stringify(billing),
    JSON.stringify({ address: shippingAddr, method: shipping }),
    JSON.stringify({ ...totals, shipping: shipping.price, tax: tax.tax, risk }),
    JSON.stringify({ validatedAt: new Date().toISOString() }),
    checkoutId
  );

  transitionCheckout(checkoutId, CHECKOUT_STATE.READY);
  return {
    checkoutId,
    state: CHECKOUT_STATE.READY,
    totals: { ...totals, shipping: shipping.price, tax: tax.tax, couponCode: stock.cart.cart.couponCode },
    shipping,
    tax,
    risk,
    coupon: stock.cart.cart.couponCode
      ? { code: stock.cart.cart.couponCode, discount: stock.cart.discount }
      : null,
    dryRun: getEffectiveFlags().checkoutDryRunOnly,
    salesEnabled: getEffectiveFlags().salesEnabled,
  };
}

function completeCheckout(checkoutId, body = {}, ctx = {}) {
  const run = () => {
    const checkout = getCheckout(checkoutId, ctx);
    if (checkout.error) return checkout;
    if (checkout.state !== CHECKOUT_STATE.READY) {
      return { error: "checkout_not_ready", state: checkout.state, status: 409 };
    }

    const orderBlock = assertCanCreateOrder({ orderType: checkout.orderType, req: ctx.req });
    if (orderBlock && checkout.orderType === ORDER_TYPE.COMMERCIAL) {
      transitionCheckout(checkoutId, CHECKOUT_STATE.BLOCKED);
      return orderBlock;
    }

    const sanitized = paymentService.sanitizePaymentPayload(body);
    if (sanitized.rejected) {
      return { error: sanitized.code, status: 400 };
    }

    transitionCheckout(checkoutId, CHECKOUT_STATE.PAYMENT_PENDING);

    const totals = checkout.totals || {};
    const isDryRun = checkout.orderType !== ORDER_TYPE.COMMERCIAL || !getEffectiveFlags().salesEnabled;
    const payment = paymentService.createPaymentIntent({
      amount: totals.total,
      currency: totals.currency || "EUR",
      customerId: checkout.customerId,
      idempotencyKey: body.idempotencyKey || checkout.idempotencyKey,
      req: ctx.req,
      metadata: { checkoutId },
      dryRun: isDryRun,
    });

    if (payment.blocked || payment.error) {
      transitionCheckout(checkoutId, CHECKOUT_STATE.FAILED);
      return payment;
    }

    transitionCheckout(checkoutId, CHECKOUT_STATE.PAYMENT_AUTHORIZED);

    const order = orderService.createOrderFromCheckout({
      checkout,
      payment,
      orderType: checkout.orderType,
      req: ctx.req,
    });

    if (order.blocked || order.error) {
      transitionCheckout(checkoutId, CHECKOUT_STATE.FAILED);
      return order;
    }

    transitionCheckout(checkoutId, CHECKOUT_STATE.COMPLETED);

    try {
      const customerNotificationReadiness = require("../customer/customerNotificationReadiness");
      customerNotificationReadiness.emitCheckoutNotification(order, ctx);
    } catch {
      /* non-blocking */
    }

    return {
      checkoutId,
      state: CHECKOUT_STATE.COMPLETED,
      order,
      payment: { ...payment, realMoneyMovement: false },
      commercial: checkout.orderType === ORDER_TYPE.COMMERCIAL,
      salesEnabled: getEffectiveFlags().salesEnabled,
    };
  };

  const key = body.idempotencyKey || ctx.idempotencyKey;
  if (key) {
    return withIdempotency({ key, scope: "checkout_complete", handler: run, req: ctx.req });
  }
  return run();
}

module.exports = {
  getCheckout,
  startCheckout,
  validateCheckout,
  completeCheckout,
  transitionCheckout,
};
