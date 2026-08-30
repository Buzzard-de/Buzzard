/**
 * Part 18 — Storefront & customer readiness gate names (diagnostic only).
 */
const STOREFRONT_GATES = Object.freeze([
  "STOREFRONT",
  "SEARCH",
  "CATEGORIES",
  "PRODUCT_QUALITY",
  "SEO",
  "MERCHANT_FEED",
  "I18N",
  "CUSTOMER_AUTH",
  "CART",
  "CHECKOUT",
  "SAFETY",
]);

const READINESS_OVERALL = Object.freeze({
  READY: "READY",
  NOT_READY: "NOT_READY",
  CONDITION: "CONDITION",
});

module.exports = {
  STOREFRONT_GATES,
  READINESS_OVERALL,
};
