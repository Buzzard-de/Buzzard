const { db } = require("./db");

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

function createReview(body = {}) {
  const rating = Number(body.rating);
  const reviewBody = String(body.body || "").trim();
  const productSku = body.productSku || body.product_sku;

  if (!productSku || rating < 1 || rating > 5 || reviewBody.length < 10) {
    return { error: "Product, rating and review body are required", status: 400 };
  }

  const result = db
    .prepare(`
      INSERT INTO revr_reviews(
        product_sku, customer_id, customer_name, order_number, rating, title, body,
        status, verified_purchase, language
      )
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `)
    .run(
      productSku,
      body.customerId || body.customer_id || null,
      body.customerName || body.customer_name || "",
      body.orderNumber || body.order_number || "",
      rating,
      body.title || "",
      reviewBody,
      "pending",
      body.verifiedPurchase || body.verified_purchase ? 1 : 0,
      body.language || "de"
    );

  const insertMedia = db.prepare(`
    INSERT INTO revr_review_media(review_id, media_type, storage_key, url, alt_text)
    VALUES(?,?,?,?,?)
  `);
  (body.media || []).forEach((item) => {
    insertMedia.run(
      result.lastInsertRowid,
      item.type || item.media_type || "image",
      item.storageKey || item.storage_key || "",
      item.url || "",
      item.altText || item.alt_text || ""
    );
  });

  return {
    review: db.prepare("SELECT * FROM revr_reviews WHERE id = ?").get(result.lastInsertRowid),
    created: true,
  };
}

function getProductReviews(sku) {
  const stats =
    db.prepare("SELECT * FROM revr_product_rating_stats WHERE product_sku = ?").get(sku) || {
      product_sku: sku,
      review_count: 0,
      average_rating: 0,
    };

  const reviews = db
    .prepare(`
      SELECT r.*, CASE WHEN r.verified_purchase = 1 THEN 1 ELSE 0 END verified
      FROM revr_reviews r
      WHERE r.product_sku = ? AND r.status = 'published'
      ORDER BY r.id DESC
      LIMIT 100
    `)
    .all(sku);

  return { stats, reviews };
}

function getCustomerReviews(customerId) {
  return db
    .prepare("SELECT * FROM revr_reviews WHERE customer_id = ? ORDER BY id DESC")
    .all(customerId);
}

function markHelpful(reviewId, body = {}) {
  const customerId = body.customerId || body.customer_id;
  if (customerId) {
    db.prepare(`
      INSERT OR IGNORE INTO revr_review_votes(review_id, customer_id, vote)
      VALUES(?,?,?)
    `).run(reviewId, customerId, "helpful");
  }

  db.prepare("UPDATE revr_reviews SET helpful_count = helpful_count + 1 WHERE id = ?").run(reviewId);
  return { ok: true };
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

  return { ok: true, created: true };
}

function addReply(reviewId, body = {}) {
  const review = db.prepare("SELECT id FROM revr_reviews WHERE id = ?").get(reviewId);
  if (!review) return { error: "Review not found", status: 404 };

  db.prepare(`
    INSERT INTO revr_review_replies(review_id, author_type, author_name, body)
    VALUES(?,?,?,?)
  `).run(
    reviewId,
    body.authorType || body.author_type || "seller",
    body.authorName || body.author_name || "Buzzard",
    body.body || ""
  );

  return { ok: true };
}

function moderateReview(reviewId, body = {}) {
  const review = db.prepare("SELECT * FROM revr_reviews WHERE id = ?").get(reviewId);
  if (!review) return { error: "Review not found", status: 404 };

  const status = body.status;
  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid review status", status: 400 };
  }

  db.prepare(`
    UPDATE revr_reviews
    SET status = ?, risk_flag = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, body.riskFlag || body.risk_flag || review.risk_flag, reviewId);

  refreshProductStats(review.product_sku);
  return { review: db.prepare("SELECT * FROM revr_reviews WHERE id = ?").get(reviewId) };
}

function moderateMedia(mediaId, body = {}) {
  const media = db.prepare("SELECT id FROM revr_review_media WHERE id = ?").get(mediaId);
  if (!media) return { error: "Media not found", status: 404 };

  db.prepare("UPDATE revr_review_media SET status = ? WHERE id = ?").run(
    body.status || "approved",
    mediaId
  );

  return { ok: true };
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
    verified: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE verified_purchase = 1").get().n,
    reports: db.prepare("SELECT COUNT(*) n FROM revr_review_reports WHERE status = 'open'").get().n,
    average: db
      .prepare("SELECT COALESCE(AVG(rating), 0) n FROM revr_reviews WHERE status = 'published'")
      .get().n,
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
