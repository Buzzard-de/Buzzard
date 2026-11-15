/**
 * Local review authority.
 * A review check is not a published rating, a verified purchase, or a customer message.
 */
const { isSalesEnabled } = require("../salesMode");

const decisions = new Map();
const reviewSlots = new Set();
const moderationSlots = new Set();
const CLOSED_ORDERS = new Set(["deleted", "cancelled", "canceled"]);
const SLOT_EXCLUDED = new Set([
  "ORDER_NOT_PURCHASE",
  "ORDER_PRODUCT_MISMATCH",
  "PURCHASE_UNKNOWN",
  "PURCHASE_UNVERIFIED",
  "MOCK_NOT_REVIEW",
  "REVIEW_OWNER_UNKNOWN",
  "REVIEW_OWNER_MISMATCH",
  "REVIEW_PRODUCT_UNKNOWN",
  "REVIEW_PRODUCT_MISMATCH",
  "REVIEW_RECORD_CONFLICT",
  "TIMEOUT",
  "NETWORK_ERROR",
  "UNKNOWN",
  "BLOCKED",
  "FAILED",
]);

function text(value) {
  return value == null ? "" : String(value).trim();
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    published: false,
    verifiedPurchase: false,
    purchaseVerified: false,
    approved: false,
    verified: false,
    eligible: false,
    edited: false,
    deleted: false,
    ratingApplied: false,
    averageRating: null,
    publicRating: null,
    customerNotified: false,
    messageSent: false,
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    ...extra,
  };
}

function statusFor(code) {
  if (
    code === "TIMEOUT"
    || code === "NETWORK_ERROR"
    || code === "REVIEW_OWNER_UNKNOWN"
    || code === "REVIEW_PRODUCT_UNKNOWN"
    || code === "REVIEW_RECORD_UNKNOWN"
    || code === "REVIEW_ACTOR_UNKNOWN"
    || code === "RATING_UNKNOWN"
    || code === "PURCHASE_UNKNOWN"
    || code === "PURCHASE_UNVERIFIED"
    || code === "MODERATION_UNKNOWN"
    || code === "MODERATION_UNVERIFIED"
  ) return "UNKNOWN";
  return "BLOCKED";
}

function ratingProblem(value, required) {
  if (value == null || value === "") return required ? "RATING_UNKNOWN" : null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) return "RATING_OUT_OF_RANGE";
  return null;
}

function decideReviewAuthority(input = {}) {
  const action = text(input.action || "submit").toLowerCase();
  const customerId = text(input.customerId);
  const reviewCustomerId = input.reviewCustomerId == null ? customerId : text(input.reviewCustomerId);
  const productId = text(input.productId);
  const reviewProductId = input.reviewProductId == null ? productId : text(input.reviewProductId);
  const reviewId = text(input.reviewId);
  const actorId = text(input.actorId || input.editorId);
  const moderatorId = text(input.moderatorId);
  const orderId = text(input.orderId);
  const orderProductId = text(input.orderProductId);
  const orderCustomerId = text(input.orderCustomerId);
  const orderStatus = text(input.orderStatus).toLowerCase();
  const key = input.idempotencyKey || `${action}:${customerId}:${productId}:${reviewId}`;
  if (decisions.has(key)) {
    const prior = decisions.get(key);
    return closed("DUPLICATE_REVIEW_DECISION", prior.status, {
      ...prior,
      code: "DUPLICATE_REVIEW_DECISION",
      duplicate: true,
      published: false,
      verifiedPurchase: false,
      purchaseVerified: false,
      edited: false,
      deleted: false,
      customerNotified: false,
      messageSent: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const synthetic = input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO";
  const conflictingProductId = text(input.conflictingProductId);
  const conflictingCustomerId = text(input.conflictingCustomerId);
  const conflict = (conflictingProductId && conflictingProductId !== productId)
    || (conflictingCustomerId && conflictingCustomerId !== customerId);
  const slot = `${customerId}:${productId}`;
  const moderationKey = `${reviewId}:${action}`;
  const ratingCode = ratingProblem(input.rating, action !== "delete");
  const identityMatches = customerId && customerId === reviewCustomerId && productId && productId === reviewProductId;
  let code = "PURCHASE_UNVERIFIED";

  if (input.timeout === true || input.forceTimeout === true) code = "TIMEOUT";
  else if (input.networkError === true) code = "NETWORK_ERROR";
  else if (synthetic) code = "MOCK_NOT_REVIEW";
  else if (!customerId) code = "REVIEW_OWNER_UNKNOWN";
  else if (customerId !== reviewCustomerId) code = "REVIEW_OWNER_MISMATCH";
  else if (!productId) code = "REVIEW_PRODUCT_UNKNOWN";
  else if (productId !== reviewProductId) code = "REVIEW_PRODUCT_MISMATCH";
  else if (conflict) code = "REVIEW_RECORD_CONFLICT";
  else if (action === "submit" && reviewSlots.has(slot)) code = "DUPLICATE_REVIEW";
  else if ((action === "edit" || action === "delete" || action === "moderate" || action === "publish") && !reviewId) code = "REVIEW_RECORD_UNKNOWN";
  else if ((action === "edit" || action === "delete") && !actorId) code = "REVIEW_ACTOR_UNKNOWN";
  else if ((action === "edit" || action === "delete") && actorId !== customerId) code = "REVIEW_ACTOR_MISMATCH";
  else if (ratingCode) code = ratingCode;
  else if (CLOSED_ORDERS.has(orderStatus)) code = "ORDER_NOT_PURCHASE";
  else if (orderId && (orderProductId !== productId || orderCustomerId !== customerId)) code = "ORDER_PRODUCT_MISMATCH";
  else if ((action === "moderate" || action === "publish") && moderationSlots.has(moderationKey)) code = "DUPLICATE_MODERATION";
  else if (action === "publish") code = "PUBLISH_UNAUTHORIZED";
  else if (action === "moderate" && !moderatorId) code = "MODERATION_UNKNOWN";
  else if (action === "moderate") code = "MODERATION_UNVERIFIED";
  else if (action === "edit") code = "EDIT_NOT_APPLIED";
  else if (action === "delete") code = "DELETE_NOT_APPLIED";
  else if (!orderId) code = "PURCHASE_UNKNOWN";

  reasons.push(code);
  const status = statusFor(code);
  const result = closed(code, status, {
    reasons,
    action,
    duplicate: code === "DUPLICATE_REVIEW" || code === "DUPLICATE_MODERATION",
    customerId: identityMatches ? customerId : null,
    productId: identityMatches ? productId : null,
    reviewId: reviewId || null,
    orderId: orderId || null,
  });
  decisions.set(key, result);
  if (action === "submit" && identityMatches && !SLOT_EXCLUDED.has(code) && status !== "UNKNOWN" && status !== "BLOCKED" && status !== "FAILED") {
    reviewSlots.add(slot);
  }
  if ((action === "moderate" || action === "publish") && reviewId && code !== "TIMEOUT" && code !== "NETWORK_ERROR" && code !== "DUPLICATE_MODERATION") {
    moderationSlots.add(moderationKey);
  }
  return result;
}

function retryReviewAuthority(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0, published: false, verifiedPurchase: false });
  const retryable = prior.code === "TIMEOUT" || prior.code === "NETWORK_ERROR";
  const next = closed(retryable ? prior.code : "RETRY_NOT_APPLIED", prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: retryable ? prior.code : "RETRY_NOT_APPLIED",
    status: prior.status,
    published: false,
    verifiedPurchase: false,
    purchaseVerified: false,
    edited: false,
    deleted: false,
    customerNotified: false,
    messageSent: false,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

function resetReviewMemory() {
  decisions.clear();
  reviewSlots.clear();
  moderationSlots.clear();
}

module.exports = {
  decideReviewAuthority,
  retryReviewAuthority,
  resetReviewMemory,
};
