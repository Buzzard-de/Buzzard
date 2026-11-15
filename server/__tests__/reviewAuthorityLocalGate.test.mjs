import { beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const reviews = require("../lib/commerce/reviewAuthorityGate.js");
const catalog = require("../lib/pim/catalogPublishGate.js");
const campaigns = require("../lib/commerce/campaignAuthorityGate.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");

function review(extra = {}) {
  return {
    customerId: "cust-1",
    reviewCustomerId: "cust-1",
    productId: "prod-1",
    reviewProductId: "prod-1",
    reviewId: "rev-1",
    rating: 5,
    verified: true,
    approved: true,
    purchased: true,
    eligible: true,
    ...extra,
  };
}

describe("review authority is not a published rating", () => {
  beforeEach(() => {
    reviews.resetReviewMemory();
  });

  it("checks the customer and the product before accepting a review", () => {
    const missingOwner = reviews.decideReviewAuthority(review({ idempotencyKey: "owner-1", customerId: "", reviewCustomerId: "" }));
    expect(missingOwner.code).toBe("REVIEW_OWNER_UNKNOWN");
    expect(missingOwner.status).toBe("UNKNOWN");
    expect(missingOwner.customerId).toBeNull();
    expect(missingOwner.verifiedPurchase).toBe(false);

    const otherOwner = reviews.decideReviewAuthority(review({ idempotencyKey: "owner-2", reviewCustomerId: "cust-2" }));
    expect(otherOwner.code).toBe("REVIEW_OWNER_MISMATCH");
    expect(otherOwner.published).toBe(false);

    const missingProduct = reviews.decideReviewAuthority(review({ idempotencyKey: "prod-1", productId: "", reviewProductId: "" }));
    expect(missingProduct.code).toBe("REVIEW_PRODUCT_UNKNOWN");
    expect(missingProduct.status).toBe("UNKNOWN");

    const otherProduct = reviews.decideReviewAuthority(review({ idempotencyKey: "prod-2", reviewProductId: "prod-9" }));
    expect(otherProduct.code).toBe("REVIEW_PRODUCT_MISMATCH");
    expect(otherProduct.productId).toBeNull();
    expect(otherProduct.ratingApplied).toBe(false);

    const conflict = reviews.decideReviewAuthority(review({ idempotencyKey: "conflict-1", conflictingProductId: "prod-2" }));
    expect(conflict.code).toBe("REVIEW_RECORD_CONFLICT");
    expect(conflict.status).toBe("BLOCKED");
    expect(conflict.published).toBe(false);
  });

  it("does not turn caller flags, a synthetic review, or an unverified order into a verified purchase", () => {
    const synthetic = reviews.decideReviewAuthority(review({ idempotencyKey: "mock-1", synthetic: true, purchased: true }));
    expect(synthetic.code).toBe("MOCK_NOT_REVIEW");
    expect(synthetic.status).toBe("BLOCKED");
    expect(synthetic.verifiedPurchase).toBe(false);
    expect(synthetic.purchaseVerified).toBe(false);
    expect(synthetic.published).toBe(false);
    expect(synthetic.callerFlagIgnored).toBe(true);

    const missingOrder = reviews.decideReviewAuthority(review({ idempotencyKey: "buy-1", reviewId: "rev-buy", purchased: true, verified: true }));
    expect(missingOrder.code).toBe("PURCHASE_UNKNOWN");
    expect(missingOrder.status).toBe("UNKNOWN");
    expect(missingOrder.verifiedPurchase).toBe(false);
    expect(missingOrder.approved).toBe(false);
    expect(missingOrder.eligible).toBe(false);
    expect(missingOrder.averageRating).toBeNull();
    expect(missingOrder.publicRating).toBeNull();
    expect(missingOrder.customerNotified).toBe(false);
    expect(missingOrder.reasons).toContain("SALES_CLOSED");
    expect(missingOrder.productionReady).toBe(false);

    const consistent = reviews.decideReviewAuthority(review({
      idempotencyKey: "buy-2",
      customerId: "cust-2",
      reviewCustomerId: "cust-2",
      productId: "prod-2",
      reviewProductId: "prod-2",
      reviewId: "rev-2",
      orderId: "ord-2",
      orderProductId: "prod-2",
      orderCustomerId: "cust-2",
      orderStatus: "completed",
      purchased: true,
    }));
    expect(consistent.code).toBe("PURCHASE_UNVERIFIED");
    expect(consistent.verifiedPurchase).toBe(false);
    expect(consistent.published).toBe(false);
    expect(consistent.orderCreated).toBe(false);

    const cancelled = reviews.decideReviewAuthority(review({
      idempotencyKey: "buy-3",
      customerId: "cust-3",
      reviewCustomerId: "cust-3",
      productId: "prod-3",
      reviewProductId: "prod-3",
      orderId: "ord-3",
      orderProductId: "prod-3",
      orderCustomerId: "cust-3",
      orderStatus: "cancelled",
    }));
    expect(cancelled.code).toBe("ORDER_NOT_PURCHASE");
    expect(cancelled.verifiedPurchase).toBe(false);

    const deleted = reviews.decideReviewAuthority(review({
      idempotencyKey: "buy-4",
      customerId: "cust-4",
      reviewCustomerId: "cust-4",
      productId: "prod-4",
      reviewProductId: "prod-4",
      orderId: "ord-4",
      orderStatus: "deleted",
    }));
    expect(deleted.code).toBe("ORDER_NOT_PURCHASE");

    const mismatch = reviews.decideReviewAuthority(review({
      idempotencyKey: "buy-5",
      customerId: "cust-5",
      reviewCustomerId: "cust-5",
      productId: "prod-5",
      reviewProductId: "prod-5",
      orderId: "ord-5",
      orderProductId: "prod-other",
      orderCustomerId: "cust-5",
      orderStatus: "completed",
    }));
    expect(mismatch.code).toBe("ORDER_PRODUCT_MISMATCH");
    expect(mismatch.verifiedPurchase).toBe(false);
    expect(mismatch.paymentCreated).toBe(false);
  });

  it("rejects a bad rating and a second review from the same customer", () => {
    const low = reviews.decideReviewAuthority(review({ idempotencyKey: "rate-0", customerId: "cust-rate", reviewCustomerId: "cust-rate", rating: 0 }));
    expect(low.code).toBe("RATING_OUT_OF_RANGE");
    const high = reviews.decideReviewAuthority(review({ idempotencyKey: "rate-6", customerId: "cust-rate", reviewCustomerId: "cust-rate", rating: 6 }));
    expect(high.code).toBe("RATING_OUT_OF_RANGE");
    const fraction = reviews.decideReviewAuthority(review({ idempotencyKey: "rate-half", customerId: "cust-rate", reviewCustomerId: "cust-rate", rating: 3.5 }));
    expect(fraction.code).toBe("RATING_OUT_OF_RANGE");
    const missing = reviews.decideReviewAuthority(review({ idempotencyKey: "rate-missing", customerId: "cust-rate", reviewCustomerId: "cust-rate", rating: null }));
    expect(missing.code).toBe("RATING_UNKNOWN");
    expect(missing.status).toBe("UNKNOWN");
    expect(missing.ratingApplied).toBe(false);
    expect(missing.averageRating).toBeNull();

    const first = reviews.decideReviewAuthority(review({
      idempotencyKey: "dup-review-1",
      customerId: "cust-dup",
      reviewCustomerId: "cust-dup",
      productId: "prod-dup",
      reviewProductId: "prod-dup",
      reviewId: "rev-dup-1",
      rating: 4,
    }));
    const second = reviews.decideReviewAuthority(review({
      idempotencyKey: "dup-review-2",
      customerId: "cust-dup",
      reviewCustomerId: "cust-dup",
      productId: "prod-dup",
      reviewProductId: "prod-dup",
      reviewId: "rev-dup-2",
      rating: 5,
      purchased: true,
    }));
    expect(first.code).toBe("PURCHASE_UNKNOWN");
    expect(first.verifiedPurchase).toBe(false);
    expect(second.code).toBe("PURCHASE_UNKNOWN");
    expect(second.published).toBe(false);
    expect(second.verifiedPurchase).toBe(false);
    const sameKey = reviews.decideReviewAuthority(review({
      idempotencyKey: "dup-review-1",
      customerId: "cust-dup",
      reviewCustomerId: "cust-dup",
      productId: "prod-dup",
      reviewProductId: "prod-dup",
      reviewId: "rev-dup-1",
      rating: 4,
    }));
    expect(sameKey.code).toBe("DUPLICATE_REVIEW_DECISION");
    expect(sameKey.duplicate).toBe(true);
    expect(sameKey.published).toBe(false);
    expect(sameKey.verifiedPurchase).toBe(false);
  });

  it("does not keep a rejected review attempt in memory", () => {
    const cancelled = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-cancel",
      customerId: "cust-slot",
      reviewCustomerId: "cust-slot",
      productId: "prod-slot",
      reviewProductId: "prod-slot",
      orderId: "ord-slot",
      orderProductId: "prod-slot",
      orderCustomerId: "cust-slot",
      orderStatus: "cancelled",
    }));
    expect(cancelled.code).toBe("ORDER_NOT_PURCHASE");
    expect(cancelled.verifiedPurchase).toBe(false);
    expect(cancelled.published).toBe(false);
    const afterCancelled = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-cancel-next",
      customerId: "cust-slot",
      reviewCustomerId: "cust-slot",
      productId: "prod-slot",
      reviewProductId: "prod-slot",
      orderId: "ord-slot-2",
      orderProductId: "prod-slot",
      orderCustomerId: "cust-slot",
      orderStatus: "completed",
      purchased: true,
    }));
    expect(afterCancelled.code).toBe("PURCHASE_UNVERIFIED");
    expect(afterCancelled.verifiedPurchase).toBe(false);
    expect(afterCancelled.published).toBe(false);

    const unverified = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-unverified",
      customerId: "cust-unverified",
      reviewCustomerId: "cust-unverified",
      productId: "prod-unverified",
      reviewProductId: "prod-unverified",
      orderId: "ord-unverified",
      orderProductId: "prod-unverified",
      orderCustomerId: "cust-unverified",
      orderStatus: "completed",
    }));
    expect(unverified.code).toBe("PURCHASE_UNVERIFIED");
    const afterUnverified = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-unverified-next",
      customerId: "cust-unverified",
      reviewCustomerId: "cust-unverified",
      productId: "prod-unverified",
      reviewProductId: "prod-unverified",
    }));
    expect(afterUnverified.code).toBe("PURCHASE_UNKNOWN");
    expect(afterUnverified.verifiedPurchase).toBe(false);
    expect(afterUnverified.published).toBe(false);

    const synthetic = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-mock",
      customerId: "cust-mock",
      reviewCustomerId: "cust-mock",
      productId: "prod-mock",
      reviewProductId: "prod-mock",
      synthetic: true,
    }));
    expect(synthetic.code).toBe("MOCK_NOT_REVIEW");
    const afterSynthetic = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-mock-next",
      customerId: "cust-mock",
      reviewCustomerId: "cust-mock",
      productId: "prod-mock",
      reviewProductId: "prod-mock",
    }));
    expect(afterSynthetic.code).toBe("PURCHASE_UNKNOWN");
    expect(afterSynthetic.verifiedPurchase).toBe(false);

    const mismatch = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-owner",
      customerId: "cust-owner",
      reviewCustomerId: "cust-other",
      productId: "prod-owner",
      reviewProductId: "prod-owner",
    }));
    expect(mismatch.code).toBe("REVIEW_OWNER_MISMATCH");
    const afterMismatch = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-owner-next",
      customerId: "cust-owner",
      reviewCustomerId: "cust-owner",
      productId: "prod-owner",
      reviewProductId: "prod-owner",
    }));
    expect(afterMismatch.code).toBe("PURCHASE_UNKNOWN");
    expect(afterMismatch.published).toBe(false);
    expect(afterMismatch.verifiedPurchase).toBe(false);
  });

  it("keeps an accepted duplicate guard and isolates review memory", () => {
    const publish = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-pub",
      action: "publish",
      reviewId: "rev-slot-pub",
      moderatorId: "mod-slot",
      approved: true,
      purchased: true,
    }));
    expect(publish.code).toBe("PUBLISH_UNAUTHORIZED");
    expect(publish.published).toBe(false);
    expect(publish.verifiedPurchase).toBe(false);
    const repeatPublish = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-pub-2",
      action: "publish",
      reviewId: "rev-slot-pub",
      moderatorId: "mod-slot",
    }));
    expect(repeatPublish.code).toBe("DUPLICATE_MODERATION");
    expect(repeatPublish.published).toBe(false);
    expect(repeatPublish.verifiedPurchase).toBe(false);

    reviews.resetReviewMemory();
    const fresh = reviews.decideReviewAuthority(review({
      idempotencyKey: "slot-pub",
      action: "publish",
      reviewId: "rev-slot-pub",
      moderatorId: "mod-slot",
    }));
    expect(fresh.code).toBe("PUBLISH_UNAUTHORIZED");
    expect(fresh.published).toBe(false);
    expect(fresh.verifiedPurchase).toBe(false);
  });

  it("keeps moderation, edits, and deletes separate from purchase verification", () => {
    const publish = reviews.decideReviewAuthority(review({
      idempotencyKey: "pub-1",
      action: "publish",
      reviewId: "rev-pub",
      moderatorId: "mod-1",
      orderId: "ord-pub",
      orderProductId: "prod-1",
      orderCustomerId: "cust-1",
      orderStatus: "completed",
      approved: true,
      purchased: true,
    }));
    expect(publish.code).toBe("PUBLISH_UNAUTHORIZED");
    expect(publish.status).toBe("BLOCKED");
    expect(publish.published).toBe(false);
    expect(publish.verifiedPurchase).toBe(false);
    expect(publish.customerNotified).toBe(false);
    expect(publish.messageSent).toBe(false);

    const moderate = reviews.decideReviewAuthority(review({
      idempotencyKey: "mod-1",
      action: "moderate",
      reviewId: "rev-mod",
      purchased: true,
    }));
    expect(moderate.code).toBe("MODERATION_UNKNOWN");
    expect(moderate.status).toBe("UNKNOWN");
    expect(moderate.published).toBe(false);
    expect(moderate.verifiedPurchase).toBe(false);

    const repeatPublish = reviews.decideReviewAuthority(review({
      idempotencyKey: "pub-2",
      action: "publish",
      reviewId: "rev-pub",
      moderatorId: "mod-1",
      approved: true,
    }));
    expect(repeatPublish.code).toBe("DUPLICATE_MODERATION");
    expect(repeatPublish.published).toBe(false);

    const sameDecision = reviews.decideReviewAuthority(review({ idempotencyKey: "pub-1", action: "publish", approved: true }));
    expect(sameDecision.code).toBe("DUPLICATE_REVIEW_DECISION");
    expect(sameDecision.duplicate).toBe(true);
    expect(sameDecision.published).toBe(false);
    expect(sameDecision.customerNotified).toBe(false);

    const wrongEdit = reviews.decideReviewAuthority(review({
      idempotencyKey: "edit-1",
      action: "edit",
      reviewId: "rev-edit",
      actorId: "cust-9",
      rating: 4,
    }));
    expect(wrongEdit.code).toBe("REVIEW_ACTOR_MISMATCH");
    expect(wrongEdit.edited).toBe(false);
    expect(wrongEdit.published).toBe(false);

    const ownEdit = reviews.decideReviewAuthority(review({
      idempotencyKey: "edit-2",
      action: "edit",
      reviewId: "rev-edit",
      actorId: "cust-1",
      rating: 4,
    }));
    expect(ownEdit.code).toBe("EDIT_NOT_APPLIED");
    expect(ownEdit.edited).toBe(false);
    expect(ownEdit.verifiedPurchase).toBe(false);
    expect(ownEdit.customerNotified).toBe(false);

    const wrongDelete = reviews.decideReviewAuthority(review({
      idempotencyKey: "del-1",
      action: "delete",
      reviewId: "rev-del",
      actorId: "cust-9",
    }));
    expect(wrongDelete.code).toBe("REVIEW_ACTOR_MISMATCH");
    expect(wrongDelete.deleted).toBe(false);

    const ownDelete = reviews.decideReviewAuthority(review({
      idempotencyKey: "del-2",
      action: "delete",
      reviewId: "rev-del",
      actorId: "cust-1",
    }));
    expect(ownDelete.code).toBe("DELETE_NOT_APPLIED");
    expect(ownDelete.deleted).toBe(false);
    expect(ownDelete.published).toBe(false);
    expect(ownDelete.messageSent).toBe(false);
  });

  it("keeps publication closed on timeout and leaves product and customer checks closed", () => {
    const failed = reviews.decideReviewAuthority(review({ idempotencyKey: "fail-1", timeout: true, approved: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("UNKNOWN");
    expect(failed.published).toBe(false);
    expect(failed.verifiedPurchase).toBe(false);
    expect(failed.customerNotified).toBe(false);
    const retried = reviews.retryReviewAuthority("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("UNKNOWN");
    expect(retried.attempts).toBe(2);
    expect(retried.published).toBe(false);
    expect(retried.messageSent).toBe(false);
    expect(reviews.retryReviewAuthority("missing-review").code).toBe("RETRY_UNKNOWN");

    const listing = catalog.planCatalogPublish({
      idempotencyKey: "compat-catalog",
      sku: "BZ-1",
      country: "DE",
      marketplace: "buzzard",
      category: "sensors",
      productVerified: true,
    });
    expect(listing.published).toBe(false);
    expect(listing.sellable).toBe(false);

    const campaign = campaigns.decideCampaignAuthority({
      idempotencyKey: "compat-campaign",
      campaignId: "camp-1",
      sourceRecordId: "rec-1",
      authoritySource: "campaign-registry",
      ownerId: "owner-1",
      verified: true,
      active: true,
    });
    expect(campaign.authorized).toBe(false);
    expect(campaign.discount).toBeNull();
    expect(campaign.commercialTotal).toBeNull();

    const permission = consent.decideMarketingConsent({
      idempotencyKey: "compat-consent",
      customerId: "cust-review",
      channel: "email",
      action: "grant",
      source: "account-settings",
      scope: "marketing-email",
      consentedAt: "2020-01-01T00:00:00.000Z",
      consent: true,
      verified: true,
    });
    expect(permission.granted).toBe(false);
    expect(permission.emailSent).toBe(false);

    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();
  });
});
