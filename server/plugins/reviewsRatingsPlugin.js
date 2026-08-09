const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const reviewsRatings = require("../lib/reviewsRatings");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

module.exports = {
  register(app) {
    if (!reviewsRatings.isEnabled()) {
      console.log("Reviews ratings disabled (BUZZARD_REVIEWS_RATINGS=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/reviews-ratings/reviews", (req, res) => {
      const result = reviewsRatings.createReview(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.review);
    });

    app.get("/api/reviews-ratings/products/:sku/reviews", (req, res) => {
      return res.json(reviewsRatings.getProductReviews(req.params.sku));
    });

    app.get("/api/reviews-ratings/customers/:id/reviews", (req, res) => {
      return res.json(reviewsRatings.getCustomerReviews(req.params.id));
    });

    app.post("/api/reviews-ratings/reviews/:id/helpful", (req, res) => {
      return res.json(reviewsRatings.markHelpful(req.params.id, req.body || {}));
    });

    app.post("/api/reviews-ratings/reviews/:id/report", (req, res) => {
      const result = reviewsRatings.reportReview(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result);
    });

    app.post("/api/admin/reviews-ratings/reviews/:id/reply", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = reviewsRatings.addReply(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.patch("/api/admin/reviews-ratings/reviews/:id/moderate", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = reviewsRatings.moderateReview(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.review);
    });

    app.patch("/api/admin/reviews-ratings/media/:id/moderate", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = reviewsRatings.moderateMedia(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/reviews-ratings/reviews", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(reviewsRatings.listReviews(req.query || {}));
    });

    app.get("/api/admin/reviews-ratings/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(reviewsRatings.getReviewsOverview());
    });
  },
};
