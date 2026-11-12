/**
 * Part 8 — Commerce input validation (server-authoritative pricing)
 */
const { MAX_CART_QUANTITY, MAX_CART_ITEMS } = require("../../core/commerceConstants");

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function validateQuantity(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return { ok: false, code: "quantity_invalid", message: "Quantity must be a positive integer" };
  }
  if (n > MAX_CART_QUANTITY) {
    return { ok: false, code: "quantity_too_high", message: `Quantity cannot exceed ${MAX_CART_QUANTITY}` };
  }
  return { ok: true, quantity: n };
}

function validatePrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, code: "price_invalid", message: "Price must be a non-negative number" };
  }
  return { ok: true, price: roundMoney(n) };
}

function validateDiscount(discount, subtotal) {
  const n = Number(discount);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, code: "discount_invalid", message: "Discount cannot be negative" };
  }
  if (n > subtotal) {
    return { ok: false, code: "discount_exceeds_subtotal", message: "Discount exceeds subtotal" };
  }
  return { ok: true, discount: roundMoney(n) };
}

function rejectClientTotals(clientTotals = {}) {
  if (
    clientTotals.subtotal !== undefined ||
    clientTotals.total !== undefined ||
    clientTotals.tax !== undefined ||
    clientTotals.shipping !== undefined ||
    clientTotals.discount !== undefined
  ) {
    return {
      ok: false,
      code: "client_totals_rejected",
      message: "Client-provided totals are ignored; server recalculates all amounts",
    };
  }
  return { ok: true };
}

function detectPriceTampering(clientPrice, serverPrice, tolerance = 0.01) {
  const client = Number(clientPrice);
  const server = Number(serverPrice);
  if (!Number.isFinite(client)) return { tampered: false };
  if (Math.abs(client - server) > tolerance) {
    return {
      tampered: true,
      code: "price_tampering",
      message: "Client price does not match authoritative server price",
      clientPrice: client,
      serverPrice: server,
    };
  }
  return { tampered: false };
}

function computeLineTotal(price, quantity) {
  return roundMoney(Number(price) * Number(quantity));
}

function readComponent(value) {
  if (value == null || value === "") return { present: false, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { invalid: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return { invalid: true, value: null };
  return { present: true, value: roundMoney(value) };
}

function computeOrderTotals({ items = [], shipping, taxRate, currency = "EUR" } = {}) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + computeLineTotal(item.priceSnapshot, item.quantity), 0));
  const ship = readComponent(shipping);
  const rate = readComponent(taxRate);
  const shippingAmt = ship.present ? ship.value : null;
  const tax = rate.present ? roundMoney((subtotal * rate.value) / 100) : null;
  const total = shippingAmt == null || tax == null ? null : roundMoney(subtotal + tax + shippingAmt);

  return {
    ok: ship.invalid || rate.invalid ? false : total != null,
    code: ship.invalid || rate.invalid ? "INVALID_AMOUNT" : total == null ? "AMOUNT_UNKNOWN" : "TOTALS_COMPUTED",
    subtotal,
    discount: null,
    discountApplied: false,
    couponStatus: "BLOCKED",
    taxBase: subtotal,
    shipping: shippingAmt,
    tax,
    taxRate: rate.present ? rate.value : null,
    total,
    currency,
    totalsVerified: total != null,
  };
}

function validateCartItemCount(count) {
  if (count > MAX_CART_ITEMS) {
    return { ok: false, code: "cart_too_large", message: `Cart cannot exceed ${MAX_CART_ITEMS} items` };
  }
  return { ok: true };
}

function validateAddress(address = {}, { requireFields = false } = {}) {
  const errors = [];
  if (requireFields) {
    for (const field of ["line1", "city", "postalCode", "country"]) {
      if (!address[field] || String(address[field]).trim().length < 2) {
        errors.push({ field, code: "address_field_required" });
      }
    }
  }
  if (address.country && String(address.country).length !== 2) {
    errors.push({ field: "country", code: "address_country_invalid" });
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = {
  roundMoney,
  validateQuantity,
  validatePrice,
  validateDiscount,
  rejectClientTotals,
  detectPriceTampering,
  computeLineTotal,
  computeOrderTotals,
  validateCartItemCount,
  validateAddress,
};
