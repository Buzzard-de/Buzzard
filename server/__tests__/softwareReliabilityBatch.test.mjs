import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("software reliability batch — pricing, cancel, returns, marketplace", () => {
  let software;
  let db;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    software.initialize(db);
  });

  it("accounts for payment fees without inventing them or undercutting", () => {
    const missingFee = software.pricing.quote({
      supplierCost: 10,
      shippingCost: 2,
      extraCosts: 0,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
      taxRate: 0.19,
    });
    expect(missingFee.ok).toBe(true);
    expect(missingFee.paymentFeeAccounted).toBe(false);
    expect(missingFee.marketUndercut.implemented).toBe(false);
    expect(missingFee.minNetProfitEur).toBe(0.5);

    const withFee = software.pricing.quote({
      supplierCost: 10,
      shippingCost: 2,
      extraCosts: 0,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
      taxRate: 0.19,
      paymentFeeRate: 0.029,
    });
    expect(withFee.ok).toBe(true);
    expect(withFee.paymentFeeAccounted).toBe(true);
    expect(withFee.paymentFee).toBeGreaterThan(0);
    expect(withFee.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(withFee.saleApproved).toBe(true);

    expect(software.pricing.quote({
      supplierCost: 10,
      shippingCost: 1,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.1,
      taxRate: 0.19,
      paymentFee: -1,
    }).reason).toBe("NEGATIVE_PAYMENT_FEE");
  });

  it("cancels drafts idempotently without a commercial order", () => {
    software.orders.resetCancelledDrafts();
    const draft = software.orders.createDraft({ sku: "REL-1", customerId: "c1" });
    expect(draft.commercialCreated).toBe(false);
    const first = software.orders.cancelDraft({ draftId: draft.orderId || "draft_REL-1_c1" });
    const second = software.orders.cancelDraft({ draftId: draft.orderId || "draft_REL-1_c1" });
    expect(first.cancelled).toBe(true);
    expect(first.commercialCreated).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.commercialCreated).toBe(false);
  });

  it("separates estimated return money from actual execution", () => {
    const opened = software.returns.openCase(db, {
      orderNumber: `REL-RET-${Date.now()}`,
      customerId: "cust-rel",
      reason: "damaged",
      refundAmount: 12.5,
    });
    expect(opened.ok).toBe(true);
    expect(opened.estimated.customerRefund).toBe(12.5);
    expect(opened.estimated.invented).toBe(false);
    expect(opened.actual.executed).toBe(false);
    expect(opened.actual.customerRefund).toBeNull();
    expect(opened.refundExecuted).toBe(false);
    expect(opened.supplierCredit.assumedFromCustomerRefund).toBe(false);
  });

  it("marketplace dry-run and auth checks never go live", () => {
    const dry = software.marketplace.dryRunListing({
      channel: "amazon",
      sku: "REL-MP-1",
      price: 20,
      category: "pads",
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.published).toBe(false);
    expect(dry.live).toBe(false);
    expect(dry.listingId).toBeNull();

    const auth = software.marketplace.validateAuthConfig("amazon", {});
    expect(auth.live).toBe(false);
    expect(auth.authTested).toBe(false);
    expect(auth.credentialsPresent).toBe(false);
    expect(auth.secretsIncluded).toBe(false);

    const rate = software.marketplace.classifyMarketplaceError("429 rate limited");
    expect(rate.code).toBe("RATE_LIMIT");
    expect(rate.retryable).toBe(true);
    expect(rate.live).toBe(false);
    const authErr = software.marketplace.classifyMarketplaceError("401 unauthorized");
    expect(authErr.retryable).toBe(false);
  });

  it("preserves supplier source ids and rejects invalid costs", () => {
    const preview = software.supplierFeeds.preview({
      format: "json",
      supplierId: "rel-feed",
      payload: [
        { sku: "SRC-1", price: 8, currency: "EUR", source_id: "IC-99", cost: -3 },
      ],
    });
    expect(preview.written).toBe(false);
    expect(preview.live).toBe(false);
    expect(preview.rows[0].sourceId).toBe("IC-99");
    expect(preview.errors.some((row) => row.code === "SUPPLIER_COST_INVALID")).toBe(true);
  });
});

describe("commerce order cancel idempotency", () => {
  it("replays cancel without a second commercial effect", () => {
    const { db } = require("../lib/db");
    const { ORDER_STATUS } = require("../core/commerceConstants");
    const orders = require("../lib/commerce/orderService");
    const id = `ord_rel_${Date.now()}`;
    db.prepare(
      `INSERT INTO commerce_orders(
        id, checkout_id, customer_id, order_type, status, payment_status, fulfillment_status,
        currency, subtotal, shipping, tax, discount, total, items_json, metadata_json
      ) VALUES (?, NULL, NULL, 'DRY_RUN', ?, 'NONE', 'NONE', 'EUR', 0, 0, 0, 0, 0, '[]', '{}')`
    ).run(id, ORDER_STATUS.CONFIRMED);
    const first = orders.cancelOrder(id, { skipAccessCheck: true });
    const second = orders.cancelOrder(id, { skipAccessCheck: true });
    expect(first.error).toBeUndefined();
    expect(first.cancelled).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.commercialSideEffects).toBe(false);
  });
});
