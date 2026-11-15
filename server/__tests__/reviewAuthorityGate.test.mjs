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
    expect(created.code).toBe("PURCHASE_UNKNOWN");
    expect(created.status).toBe("UNKNOWN");
    expect(created.created).toBe(false);
    expect(created.stored).toBe(false);
    expect(JSON.stringify(created)).not.toContain(secret);

    const approved = checkout.updateReviewStatus(created.id, "approved", { approved: true, verified: true, live: true, email: secret });
    expect(approved.ok).toBe(false);
    expect(approved.code).toBe("REVIEW_OWNER_UNKNOWN");
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
    expect(checkout.listApprovedReviews("sku-1")).toEqual([]);

    const rejected = checkout.updateReviewStatus(created.id, "rejected", {});
    expect(rejected.moderated).toBe(false);
    expect(rejected.published).toBe(false);
    expect(rejected.customerNotified).toBe(false);
    expect(rejected.stored).toBe(false);

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
    expect(catalog.created).toBe(false);
    expect(catalog.code).toBe("PURCHASE_UNKNOWN");
    expect(catalog.review).toBeNull();
    expect(JSON.stringify(catalog)).not.toContain(secret);
    const moderated = ratings.moderateReview("missing-catalog-review", { status: "published", approved: true, verified: true, live: true });
    expect(moderated.code).toBe("REVIEW_OWNER_UNKNOWN");
    expect(moderated.ratingApplied).toBe(false);
    expect(moderated.stored).toBe(false);
    const hidden = ratings.moderateReview("missing-catalog-review", { status: "hidden" });
    expect(hidden.moderated).toBe(false);
    expect(hidden.published).toBe(false);
    expect(ratings.getProductReviews("sku-1").reviews).toEqual([]);
    expect(ratings.getProductReviews("sku-1").stats.average_rating).toBeNull();
    expect(ratings.markHelpful("missing-catalog-review", { customerId: user }).ratingApplied).toBe(false);
    expect(ratings.addReply("missing-catalog-review", { body: "Thanks", email: secret }).customerNotified).toBe(false);
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

describe("FIN-M28 review authority stays closed", () => {
  function purchase(extra = {}) {
    return {
      customerId: "cust-m28",
      productId: "sku-m28",
      rating: 5,
      orderId: "ord-m28",
      orderProductId: "sku-m28",
      orderCustomerId: "cust-m28",
      verifiedPurchase: true,
      ok: true,
      authorized: true,
      approved: true,
      status: 200,
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.created).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.moderated).toBe(false);
    expect(result.published).toBe(false);
    expect(result.verifiedPurchase).toBe(false);
    expect(result.purchaseVerified).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.ratingApplied).toBe(false);
    expect(result.customerNotified).toBe(false);
    expect(result.messageSent).toBe(false);
    expect(result.review).toBeNull();
    expect(result.id).toBeNull();
    expect(result.status).not.toBe(200);
    expect(result.callerAuthorityIgnored).toBe(true);
  }

  it("does not create a review before the purchase is verified", () => {
    const checkoutReview = checkout.createReview("cust-m28", purchase({ idempotencyKey: "m28-checkout-purchase" }));
    const catalogReview = ratings.createReview(purchase({
      idempotencyKey: "m28-ratings-purchase",
      customerId: "cust-m28-catalog",
      orderCustomerId: "cust-m28-catalog",
    }));
    expectClosed(checkoutReview);
    expectClosed(catalogReview);
    expect(checkoutReview.code).toBe("PURCHASE_UNVERIFIED");
    expect(catalogReview.code).toBe("PURCHASE_UNVERIFIED");
    expect(checkoutReview.status).toBe("UNKNOWN");
    expect(catalogReview.status).toBe("UNKNOWN");
  });

  it("keeps unknown, blocked, failed, and timeout reviews closed", () => {
    const unknown = checkout.createReview("cust-m28-unknown", purchase({
      idempotencyKey: "m28-unknown",
      customerId: "cust-m28-unknown",
      orderId: "",
      orderProductId: "",
      orderCustomerId: "",
    }));
    expectClosed(unknown);
    expect(unknown.code).toBe("PURCHASE_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");

    const blocked = ratings.moderateReview("rev-m28-blocked", purchase({
      idempotencyKey: "m28-blocked",
      customerId: "cust-m28-blocked",
      orderCustomerId: "cust-m28-blocked",
      status: "published",
    }));
    expectClosed(blocked);
    expect(blocked.code).toBe("PUBLISH_UNAUTHORIZED");
    expect(blocked.status).toBe("BLOCKED");

    const failed = checkout.updateReviewStatus("rev-m28-failed", "rejected", purchase({
      idempotencyKey: "m28-failed",
      customerId: "cust-m28-failed",
      networkError: true,
      status: "FAILED",
    }));
    expectClosed(failed);
    expect(failed.code).toBe("NETWORK_ERROR");
    expect(failed.status).toBe("UNKNOWN");

    const timedOut = ratings.createReview(purchase({
      idempotencyKey: "m28-timeout",
      customerId: "cust-m28-timeout",
      orderCustomerId: "cust-m28-timeout",
      timeout: true,
    }));
    expectClosed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("UNKNOWN");
  });

  it("does not grant a second moderation or publish a review", () => {
    const first = ratings.moderateReview("rev-m28-repeat", purchase({
      idempotencyKey: "m28-mod-1",
      customerId: "cust-m28-mod",
      orderCustomerId: "cust-m28-mod",
      moderatorId: "mod-m28",
      status: "hidden",
    }));
    const second = checkout.updateReviewStatus("rev-m28-repeat", "rejected", purchase({
      idempotencyKey: "m28-mod-2",
      customerId: "cust-m28-mod",
      orderCustomerId: "cust-m28-mod",
      moderatorId: "mod-m28",
    }));
    expectClosed(first);
    expectClosed(second);
    expect(first.code).toBe("MODERATION_UNVERIFIED");
    expect(first.status).toBe("UNKNOWN");
    expect(second.code).toBe("DUPLICATE_MODERATION");
    expect(second.duplicate).toBe(true);
    expect(second.published).toBe(false);
    expect(second.customerNotified).toBe(false);
  });
});
