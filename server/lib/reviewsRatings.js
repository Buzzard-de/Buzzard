const { db } = require("./db");
const { decideReviewAuthority } = require("./commerce/reviewAuthorityGate");

const VALID_STATUSES = ["pending", "published", "rejected", "hidden"];

function isEnabled() {
  return process.env.BUZZARD_REVIEWS_RATINGS !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function refreshProductStats(sku) {
  const rows = db
    .prepare(`
      SELECT rating, COUNT(*) n
      FROM revr_reviews
      WHERE product_sku = ? AND status = 'published'
      GROUP BY rating
    `)
    .all(sku);

  const count = rows.reduce((sum, row) => sum + row.n, 0);
  const total = rows.reduce((sum, row) => sum + row.rating * row.n, 0);
  const get = (rating) => rows.find((row) => row.rating === rating)?.n || 0;

  db.prepare(`
    INSERT INTO revr_product_rating_stats(
      product_sku, review_count, average_rating, rating_1, rating_2, rating_3, rating_4, rating_5
    )
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(product_sku) DO UPDATE SET
      review_count = excluded.review_count,
      average_rating = excluded.average_rating,
      rating_1 = excluded.rating_1,
      rating_2 = excluded.rating_2,
      rating_3 = excluded.rating_3,
      rating_4 = excluded.rating_4,
      rating_5 = excluded.rating_5,
      updated_at = CURRENT_TIMESTAMP
  `).run(sku, count, count ? total / count : 0, get(1), get(2), get(3), get(4), get(5));
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function reviewAuthorityInput(request, action, reviewId) {
  const customerId = text(request.customerId || request.customer_id);
  const productId = text(request.productId || request.productSku || request.product_sku);
  return {
    action,
    customerId,
    reviewCustomerId: request.reviewCustomerId == null ? customerId : text(request.reviewCustomerId),
    productId,
    reviewProductId: request.reviewProductId == null ? productId : text(request.reviewProductId),
    reviewId: text(reviewId),
    actorId: text(request.actorId || request.editorId),
    moderatorId: text(request.moderatorId),
    orderId: text(request.orderId),
    orderProductId: text(request.orderProductId),
    orderCustomerId: text(request.orderCustomerId),
    orderStatus: text(request.orderStatus),
    rating: typeof request.rating === "number" ? request.rating : request.rating,
    timeout: request.timeout === true,
    forceTimeout: request.forceTimeout === true,
    networkError: request.networkError === true,
    mock: request.mock === true,
    synthetic: request.synthetic === true,
    source: request.source,
    conflictingProductId: request.conflictingProductId,
    conflictingCustomerId: request.conflictingCustomerId,
    idempotencyKey: request.idempotencyKey,
  };
}

function reviewClosed(request, decision) {
  return {
    ok: false,
    error: decision.code,
    code: decision.code,
    status: decision.status,
    created: false,
    stored: false,
    moderated: false,
    published: false,
    verifiedPurchase: false,
    purchaseVerified: false,
    approved: false,
    verified: false,
    eligible: false,
    ratingApplied: false,
    rewardIssued: false,
    customerNotified: false,
    messageSent: false,
    orderCreated: false,
    paymentCreated: false,
    review: null,
    id: null,
    callerFlagIgnored: true,
    callerAuthorityIgnored: request.ok === true || request.authorized === true || request.approved === true || request.status === 200 || request.verifiedPurchase === true,
    duplicate: decision.duplicate === true,
    reasons: Array.isArray(decision.reasons) ? decision.reasons.slice() : [decision.code],
  };
}

function createReview(body = {}) {
  const request = body && typeof body === "object" ? body : {};
  const productId = text(request.productId || request.productSku || request.product_sku);
  const customerId = text(request.customerId || request.customer_id);
  const decision = decideReviewAuthority({
    ...reviewAuthorityInput(request, "submit", request.reviewId),
    idempotencyKey: request.idempotencyKey || `ratings-review-create:${customerId}:${productId}:${text(request.orderId)}`,
  });
  return reviewClosed(request, decision);
}

function getProductReviews(sku) {
  return {
    stats: { product_sku: sku, review_count: 0, average_rating: null, published: false, verifiedPurchase: false },
    reviews: [],
    published: false,
  };
}

function getCustomerReviews(customerId) {
  return db
    .prepare("SELECT * FROM revr_reviews WHERE customer_id = ? ORDER BY id DESC")
    .all(customerId);
}

function markHelpful() {
  return { ok: false, code: "ORDER_UNVERIFIED", stored: false, ratingApplied: false, customerNotified: false, callerFlagIgnored: true };
}

function reportReview(reviewId, body = {}) {
  const review = db.prepare("SELECT id FROM revr_reviews WHERE id = ?").get(reviewId);
  if (!review) return { error: "Review not found", status: 404 };

  db.prepare(`
    INSERT INTO revr_review_reports(review_id, customer_id, reason)
    VALUES(?,?,?)
  `).run(reviewId, body.customerId || body.customer_id || null, body.reason || "other");

  db.prepare(`
    UPDATE revr_reviews
    SET report_count = report_count + 1,
        risk_flag = CASE WHEN report_count >= 2 THEN 'review' ELSE risk_flag END
    WHERE id = ?
  `).run(reviewId);

  return { ok: false, created: true, published: false, customerNotified: false, verifiedPurchase: false };
}

function addReply(reviewId) {
  const review = db.prepare("SELECT id FROM revr_reviews WHERE id = ?").get(reviewId);
  if (!review) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 404, stored: false, customerNotified: false };
  return { ok: false, code: "ORDER_UNVERIFIED", status: 409, stored: false, customerNotified: false, callerFlagIgnored: true };
}

function moderateReview(reviewId, body = {}) {
  const request = body && typeof body === "object" ? body : {};
  const requested = text(request.status);
  const action = requested === "published" || requested === "approved" ? "publish" : "moderate";
  const decision = decideReviewAuthority({
    ...reviewAuthorityInput(request, action, reviewId),
    idempotencyKey: request.idempotencyKey || `ratings-review-moderate:${text(reviewId)}:${action}`,
  });
  return reviewClosed(request, decision);
}

function moderateMedia(mediaId, body = {}) {
  const media = db.prepare("SELECT id FROM revr_review_media WHERE id = ?").get(mediaId);
  if (!media) return { error: "Media not found", status: 404 };

  return { ok: false, code: "ORDER_UNVERIFIED", status: 409, stored: false, published: false, callerFlagIgnored: true };
}

function listReviews(query = {}) {
  const status = query.status || "";
  const risk = query.risk || "";
  const search = query.search || "";
  let sql = "SELECT * FROM revr_reviews WHERE 1=1";
  const args = [];

  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }
  if (risk) {
    sql += " AND risk_flag = ?";
    args.push(risk);
  }
  if (search) {
    sql += " AND (product_sku LIKE ? OR customer_name LIKE ? OR title LIKE ? OR body LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function getReviewsOverview() {
  return {
    total: db.prepare("SELECT COUNT(*) n FROM revr_reviews").get().n,
    pending: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE status = 'pending'").get().n,
    published: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE status = 'published'").get().n,
    rejected: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE status = 'rejected'").get().n,
    verified: null,
    reports: db.prepare("SELECT COUNT(*) n FROM revr_review_reports WHERE status = 'open'").get().n,
    average: null,
    publishedScore: null,
    verifiedPurchase: false,
  };
}

function getReviewsRatingsStatus() {
  const overview = getReviewsOverview();
  return {
    version: "2.7.0",
    enabled: isEnabled(),
    totals: {
      reviews: overview.total,
      pending: overview.pending,
      published: overview.published,
      rejected: overview.rejected,
      verified: overview.verified,
      reports: overview.reports,
      averageRating: overview.average,
      media: db.prepare("SELECT COUNT(*) n FROM revr_review_media").get().n,
      replies: db.prepare("SELECT COUNT(*) n FROM revr_review_replies").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  refreshProductStats,
  createReview,
  getProductReviews,
  getCustomerReviews,
  markHelpful,
  reportReview,
  addReply,
  moderateReview,
  moderateMedia,
  listReviews,
  getReviewsOverview,
  getReviewsRatingsStatus,
};
