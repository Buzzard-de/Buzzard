/**
 * Part 8 — Central commerce feature flags with parent/child enforcement
 */
const { isSalesEnabled } = require("../salesMode");

function envFlag(name, defaultValue = "0") {
  const val = process.env[name];
  if (val === undefined || val === "") return defaultValue === "1";
  return val === "1" || val === "true";
}

function getRawFlags() {
  return {
    BUZZARD_SALES_ENABLED: envFlag("BUZZARD_SALES_ENABLED", "0"),
    BUZZARD_CHECKOUT_ENABLED: envFlag("BUZZARD_CHECKOUT_ENABLED", "1"),
    BUZZARD_PAYMENT_ENABLED: envFlag("BUZZARD_PAYMENT_ENABLED", "0"),
    BUZZARD_SUPPLIER_ORDERS_ENABLED: envFlag("BUZZARD_SUPPLIER_ORDERS_ENABLED", "0"),
    BUZZARD_STRIPE_ENABLED: envFlag("BUZZARD_STRIPE_ENABLED", "0") && Boolean(process.env.STRIPE_SECRET_KEY),
    BUZZARD_PAYPAL_ENABLED: envFlag("BUZZARD_PAYPAL_ENABLED", "0") && Boolean(process.env.PAYPAL_CLIENT_ID),
  };
}

function getEffectiveFlags() {
  const raw = getRawFlags();
  const sales = raw.BUZZARD_SALES_ENABLED && isSalesEnabled();

  return {
    salesEnabled: sales,
    checkoutEnabled: raw.BUZZARD_CHECKOUT_ENABLED,
    checkoutDryRunOnly: !sales,
    paymentEnabled: sales && raw.BUZZARD_PAYMENT_ENABLED,
    supplierOrdersEnabled: sales && raw.BUZZARD_SUPPLIER_ORDERS_ENABLED,
    stripeEnabled: sales && raw.BUZZARD_STRIPE_ENABLED,
    paypalEnabled: sales && raw.BUZZARD_PAYPAL_ENABLED,
    mockPaymentOnly: !sales || !raw.BUZZARD_PAYMENT_ENABLED,
    raw,
    violations: detectFlagViolations(raw),
  };
}

function detectFlagViolations(raw) {
  const violations = [];
  const sales = raw.BUZZARD_SALES_ENABLED;

  if (!sales && raw.BUZZARD_PAYMENT_ENABLED) {
    violations.push({ flag: "BUZZARD_PAYMENT_ENABLED", reason: "Payment cannot be enabled while SALES=0" });
  }
  if (!sales && raw.BUZZARD_SUPPLIER_ORDERS_ENABLED) {
    violations.push({ flag: "BUZZARD_SUPPLIER_ORDERS_ENABLED", reason: "Supplier orders cannot be enabled while SALES=0" });
  }
  if (!sales && raw.BUZZARD_STRIPE_ENABLED) {
    violations.push({ flag: "BUZZARD_STRIPE_ENABLED", reason: "Stripe cannot be enabled while SALES=0" });
  }
  if (!sales && raw.BUZZARD_PAYPAL_ENABLED) {
    violations.push({ flag: "BUZZARD_PAYPAL_ENABLED", reason: "PayPal cannot be enabled while SALES=0" });
  }
  return violations;
}

function assertFeatureAllowed(feature) {
  const flags = getEffectiveFlags();
  const map = {
    sales: flags.salesEnabled,
    checkout: flags.checkoutEnabled,
    payment: flags.paymentEnabled,
    supplier_order: flags.supplierOrdersEnabled,
    stripe: flags.stripeEnabled,
    paypal: flags.paypalEnabled,
  };
  if (!map[feature]) {
    return {
      allowed: false,
      code: `${feature}_disabled`,
      message: `Feature '${feature}' is not enabled`,
      flags,
    };
  }
  return { allowed: true, flags };
}

module.exports = {
  getRawFlags,
  getEffectiveFlags,
  detectFlagViolations,
  assertFeatureAllowed,
};
