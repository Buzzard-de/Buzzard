import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applyCustomerRefund, calculate } = require("../lib/finance/unifiedPricing.js");
const { separateRefundAndCredit } = require("../lib/commerce/commerceRiskGates.js");

describe("customer refund amounts stay unknown until a provider pays", () => {
  it("does not store a missing refund or supplier reimbursement as zero", () => {
    const quote = calculate({
      actorId: "pricing_ai",
      supplierCost: 40,
      shipping: 6,
      marketplaceCommission: 4,
      vat: 10,
      returnReserve: 0,
      paymentFees: 0,
      category: "automotive",
    });
    expect(quote.customerRefund).toBeNull();
    expect(quote.supplierReimbursement).toBeNull();
    expect(quote.actualProfit).toBeNull();
    expect(quote.refunded).toBe(false);

    const missing = applyCustomerRefund({ estimatedProfit: 12 });
    expect(missing.customerRefund).toBeNull();
    expect(missing.requestedAmount).toBeNull();
    expect(missing.supplierReimbursement).toBeNull();
    expect(missing.actualProfit).toBeNull();
    expect(missing.refunded).toBe(false);
    expect(missing.status).toBe("BLOCKED_EXTERNAL");
    expect(missing.paymentVerified).toBe(false);

    const explicitZero = applyCustomerRefund({ estimatedProfit: 12, refund: 0 });
    expect(explicitZero.requestedAmount).toBe(0);
    expect(explicitZero.customerRefund).toBeNull();
    expect(explicitZero.supplierReimbursement).toBeNull();
  });

  it("rejects invalid amounts, foreign owners, mock proof, and a repeated order", () => {
    for (const refund of [-1, Number.NaN, Number.POSITIVE_INFINITY, "1.005", "EUR"]) {
      const rejected = applyCustomerRefund({ estimatedProfit: 12, refund, orderId: `bad-${refund}` });
      expect(rejected.code).toBe("INVALID_AMOUNT");
      expect(rejected.customerRefund).toBeNull();
      expect(rejected.recorded).toBe(false);
    }

    const foreign = applyCustomerRefund({
      estimatedProfit: 12,
      refund: 3,
      orderId: "ord-foreign",
      customerId: "other",
      ownerId: "owner",
      currency: "EUR",
    });
    expect(foreign.code).toBe("OWNERSHIP_UNVERIFIED");
    expect(foreign.refunded).toBe(false);

    const mock = applyCustomerRefund({ estimatedProfit: 12, refund: 3, mock: true, orderId: "ord-mock" });
    expect(mock.code).toBe("MOCK_NOT_COMMERCIAL");
    expect(mock.refunded).toBe(false);

    const first = applyCustomerRefund({
      estimatedProfit: 12,
      refund: 3,
      orderId: "ord-once",
      customerId: "cust",
      ownerId: "cust",
      currency: "EUR",
    });
    const second = applyCustomerRefund({
      estimatedProfit: 12,
      refund: 3,
      orderId: "ord-once",
      customerId: "cust",
      ownerId: "cust",
      currency: "EUR",
    });
    expect(first.code).toBe("PROVIDER_NOT_LIVE");
    expect(first.requestedAmount).toBe(3);
    expect(first.customerRefund).toBeNull();
    expect(first.supplierReimbursement).toBeNull();
    expect(first.supplierReimbursementAssumed).toBe(false);
    expect(first.estimatedProfit).toBe(12);
    expect(first.actualProfit).toBeNull();
    expect(first.refunded).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.code).toBe("DUPLICATE_REFUND");
    expect(second.customerRefund).toBeNull();
  });

  it("keeps a known supplier figure from paying the customer", () => {
    const split = separateRefundAndCredit({ customerRefund: 10, supplierCredit: 4 });
    expect(split.customerRefund).toBe(10);
    expect(split.supplierCredit).toBe(4);
    expect(split.assumeSupplierRepaysCustomer).toBe(false);
    expect(split.refunded).toBe(false);
    expect(separateRefundAndCredit({}).customerRefund).toBeNull();
    expect(separateRefundAndCredit({}).supplierCredit).toBeNull();
    expect(separateRefundAndCredit({ customerRefund: -2 }).code).toBe("INVALID_AMOUNT");
  });
});
