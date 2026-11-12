import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checkout = require("../lib/customerCheckout.js");
const ratings = require("../lib/reviewsRatings.js");
const productAi = require("../lib/productAi.js");
const support = require("../lib/customerSupport.js");
const { db } = require("../lib/db");

const secret = "reviewer-secret@example.test";

function counts() {
  return {
    approved: db.prepare("SELECT COUNT(*) n FROM reviews WHERE status = 'approved'").get().n,
    published: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE status = 'published'").get().n,
    verified: db.prepare("SELECT COUNT(*) n FROM revr_reviews WHERE verified_purchase = 1").get().n,
    ledger: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
  };
}

describe("review approval is not a verified purchase", () => {
  it("does not publish, score, reward, or notify from caller approval flags", async () => {
    const user = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `review-${Date.now()}@example.test`,
      "x",
      "customer",
      "Review"
    ).lastInsertRowid;
    const before = counts();
    const created = checkout.createReview(user, {
      productId: "sku-1",
      rating: 5,
      title: "Great",
      body: `Loved it ${secret}`,
      status: "approved",
      verified: true,
      approved: true,
      orderNumber: "BZ-REVIEW",
    });
    expect(created.published).toBe(false);
    expect(created.verifiedPurchase).toBe(false);
    expect(created.rewardIssued).toBe(false);
    expect(created.customerNotified).toBe(false);
    expect(created.status).toBe("pending");
    expect(JSON.stringify(created)).not.toContain(secret);
    expect(db.prepare("SELECT status FROM reviews WHERE id = ?").get(created.id).status).toBe("pending");

    const approved = checkout.updateReviewStatus(created.id, "approved", { approved: true, verified: true, live: true, email: secret });
    expect(approved.ok).toBe(false);
    expect(approved.code).toBe("ORDER_UNVERIFIED");
    expect(approved.published).toBe(false);
    expect(approved.purchaseVerified).toBe(false);
    expect(approved.ratingApplied).toBe(false);
    expect(approved.customerNotified).toBe(false);
    expect(JSON.stringify(approved)).not.toContain(secret);
    const second = checkout.updateReviewStatus(created.id, "approved", { verified: true });
    expect(second.duplicate).toBe(true);
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => checkout.updateReviewStatus(created.id, "approved", { paid: true })),
      Promise.resolve().then(() => checkout.updateReviewStatus(created.id, "approved", { successful: true })),
    ]);
    expect(left.published).toBe(false);
    expect(right.published).toBe(false);
    expect(db.prepare("SELECT status FROM reviews WHERE id = ?").get(created.id).status).toBe("pending");
    expect(checkout.listApprovedReviews("sku-1")).toEqual([]);

    const rejected = checkout.updateReviewStatus(created.id, "rejected", {});
    expect(rejected.moderated).toBe(true);
    expect(rejected.published).toBe(false);
    expect(rejected.customerNotified).toBe(false);
    expect(db.prepare("SELECT status FROM reviews WHERE id = ?").get(created.id).status).toBe("rejected");

    const catalog = ratings.createReview({
      productSku: "sku-1",
      rating: 5,
      body: "This review is long enough",
      customerName: secret,
      orderNumber: "BZ-REVIEW",
      verifiedPurchase: true,
      status: "published",
    });
    expect(catalog.published).toBe(false);
    expect(catalog.verifiedPurchase).toBe(false);
    expect(catalog.review.verified_purchase).toBe(0);
    expect(catalog.review.status).toBe("pending");
    expect(JSON.stringify(catalog)).not.toContain(secret);
    const moderated = ratings.moderateReview(catalog.review.id, { status: "published", approved: true, verified: true, live: true });
    expect(moderated.code).toBe("ORDER_UNVERIFIED");
    expect(moderated.ratingApplied).toBe(false);
    expect(db.prepare("SELECT status, verified_purchase FROM revr_reviews WHERE id = ?").get(catalog.review.id)).toEqual({
      status: "pending",
      verified_purchase: 0,
    });
    const hidden = ratings.moderateReview(catalog.review.id, { status: "hidden" });
    expect(hidden.moderated).toBe(true);
    expect(hidden.published).toBe(false);
    expect(ratings.getProductReviews("sku-1").reviews).toEqual([]);
    expect(ratings.getProductReviews("sku-1").stats.average_rating).toBeNull();
    expect(ratings.markHelpful(catalog.review.id, { customerId: user }).ratingApplied).toBe(false);
    expect(ratings.addReply(catalog.review.id, { body: "Thanks", email: secret }).customerNotified).toBe(false);
    expect(ratings.getReviewsOverview().average).toBeNull();
    expect(ratings.getReviewsOverview().verified).toBeNull();

    const ai = productAi.updateReview("missing-review", { status: "approved", reviewer: secret });
    expect(ai).toBeNull();
    const reply = support.replyTicketAdmin(1, 1, `Hello ${secret}`);
    expect(reply.customerNotified).toBe(false);
    expect(reply.sent).toBe(false);
    expect(reply.code).toBe("NOTIFICATION_NOT_PERMITTED");
    expect(JSON.stringify(reply)).not.toContain(secret);
    const ticket = support.updateTicketAdmin(1, { status: "resolved", live: true });
    expect(ticket.stored).toBe(false);
    expect(ticket.customerNotified).toBe(false);

    const after = counts();
    expect(after.approved).toBe(before.approved);
    expect(after.published).toBe(before.published);
    expect(after.verified).toBe(before.verified);
    expect(after.ledger).toBe(before.ledger);
    expect(after.coupons).toBe(before.coupons);
    expect(after.orders).toBe(before.orders);
  });
});
