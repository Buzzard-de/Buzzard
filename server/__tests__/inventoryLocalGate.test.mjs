import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/commerce/inventoryGate.js");

const fresh = new Date().toISOString();

function base(extra = {}) {
  return {
    sku: "BZ-STOCK-1",
    productSku: "BZ-STOCK-1",
    productId: "prod-1",
    supplierId: "sup-1",
    country: "DE",
    stockCountry: "DE",
    quantity: 3,
    reportedQty: 3,
    observedAt: fresh,
    customerOrderVerified: true,
    customerApproved: true,
    stockVerified: true,
    supplierConfirmed: true,
    available: 3,
    live: true,
    ...extra,
  };
}

describe("dropshipping stock stays unverified", () => {
  it("rejects a broken relation, a bad quantity, and a conflicting report", () => {
    const mismatch = gate.assessSupplierStock(base({ idempotencyKey: "rel-1", productSku: "OTHER" }));
    expect(mismatch.code).toBe("STOCK_RELATION_MISMATCH");
    expect(mismatch.ownsStock).toBe(false);
    expect(mismatch.warehouseQty).toBeNull();
    expect(mismatch.available).toBeNull();
    expect(mismatch.publishStock).toBeNull();
    expect(mismatch.purchasable).toBe(false);

    const negative = gate.assessSupplierStock(base({ idempotencyKey: "qty-1", quantity: -1, reportedQty: -1 }));
    expect(negative.code).toBe("QTY_REJECTED");
    expect(negative.status).toBe("BLOCKED");
    expect(negative.saleable).toBe(false);

    const invalid = gate.assessSupplierStock(base({ idempotencyKey: "qty-2", quantity: 1.5, reportedQty: 1.5 }));
    expect(invalid.code).toBe("QTY_REJECTED");

    const conflict = gate.assessSupplierStock(base({ idempotencyKey: "qty-3", quantity: 4, reportedQty: 9 }));
    expect(conflict.code).toBe("STOCK_CONFLICT");
    expect(conflict.available).toBeNull();
    expect(conflict.reportedQty).toBeNull();
  });

  it("does not reuse German supplier stock in another EU country", () => {
    const france = gate.assessSupplierStock(base({ idempotencyKey: "fr-1", country: "FR", stockCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_STOCK_MISMATCH");
    expect(france.status).toBe("BLOCKED");
    expect(france.country).toBe("FR");
    expect(france.stockCountry).toBe("DE");
    expect(france.countryMatch).toBe(false);
    expect(france.available).toBeNull();
    expect(france.publishStock).toBeNull();
    expect(france.purchasable).toBe(false);

    const greece = gate.assessSupplierStock(base({ idempotencyKey: "gr-1", country: "GR", stockCountry: "DE" }));
    expect(greece.country).toBe("EL");
    expect(greece.code).toBe("COUNTRY_STOCK_MISMATCH");

    const missing = gate.assessSupplierStock(base({ idempotencyKey: "stale-1", observedAt: "2020-01-01T00:00:00.000Z", quantity: undefined, reportedQty: undefined }));
    expect(missing.reasons).toEqual(expect.arrayContaining(["QTY_REJECTED", "STALE_STOCK", "STOCK_UNVERIFIED"]));
    expect(missing.available).toBeNull();
    expect(missing.publishStock).toBeNull();
  });

  it("keeps a reservation off the stock figure and ignores a caller success flag", () => {
    const held = gate.assessSupplierStock(base({ idempotencyKey: "order-1", customerOrderVerified: false, customerApproved: false }));
    expect(held.code).toBe("ORDER_UNVERIFIED");
    expect(held.reserved).toBe(false);
    expect(held.purchased).toBe(false);
    expect(held.reservationIsStock).toBe(false);
    expect(held.available).toBeNull();

    const claimed = gate.assessSupplierStock(base({ idempotencyKey: "claimed-1" }));
    expect(claimed.code).toBe("STOCK_UNVERIFIED");
    expect(claimed.status).toBe("UNKNOWN");
    expect(claimed.callerFlagIgnored).toBe(true);
    expect(claimed.supplierConfirmed).toBe(false);
    expect(claimed.saleable).toBe(false);
    expect(claimed.publishStock).toBeNull();
    expect(claimed.model).toBe("DROPSHIP");
    expect(claimed.ownsStock).toBe(false);
    expect(claimed.reasons).toContain("SALES_CLOSED");
  });

  it("blocks a repeated update, a synthetic feed, and a failed retry", () => {
    const first = gate.assessSupplierStock(base({ idempotencyKey: "dup-1", synthetic: true }));
    const second = gate.assessSupplierStock(base({ idempotencyKey: "dup-1", synthetic: true, available: 99 }));
    expect(first.code).toBe("MOCK_STOCK");
    expect(first.live).toBe(false);
    expect(first.available).toBeNull();
    expect(second.code).toBe("DUPLICATE_STOCK_UPDATE");
    expect(second.duplicate).toBe(true);
    expect(second.attempts).toBe(1);
    expect(second.purchased).toBe(false);

    const failed = gate.assessSupplierStock(base({ idempotencyKey: "fail-1", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    const retried = gate.retryStockUpdate("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.available).toBeNull();
    expect(retried.reserved).toBe(false);
    expect(retried.purchased).toBe(false);
    expect(gate.retryStockUpdate("missing-stock").code).toBe("RETRY_UNKNOWN");
  });
});
