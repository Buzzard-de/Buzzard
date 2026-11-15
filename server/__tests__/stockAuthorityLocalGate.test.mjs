import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/commerce/stockAuthorityGate.js");

const fresh = new Date().toISOString();

function report(extra = {}) {
  return {
    supplierId: "sup-1",
    source: "supplier-feed",
    sku: "BZ-AUTH-1",
    productSku: "BZ-AUTH-1",
    productId: "prod-1",
    country: "DE",
    stockCountry: "DE",
    observedAt: fresh,
    quantity: 6,
    verified: true,
    available: true,
    sellable: true,
    live: true,
    ...extra,
  };
}

describe("stock authority is not a sale", () => {
  it("separates an unverified source from the reported quantity", () => {
    const mismatch = gate.decideStockAuthority(report({ idempotencyKey: "rel-1", productSku: "OTHER", supplierId: "" }));
    expect(mismatch.code).toBe("STOCK_RELATION_MISMATCH");
    expect(mismatch.sku).toBeNull();
    expect(mismatch.quantity).toBeNull();
    expect(mismatch.saleable).toBe(false);

    const noSource = gate.decideStockAuthority(report({ idempotencyKey: "src-1", source: "" }));
    expect(noSource.code).toBe("STOCK_SOURCE_UNVERIFIED");
    expect(noSource.sourceReliability).toBe("UNVERIFIED");
    expect(noSource.quantity).toBeNull();

    const claimed = gate.decideStockAuthority(report({ idempotencyKey: "claimed-1" }));
    expect(claimed.code).toBe("STOCK_AUTHORITY_UNVERIFIED");
    expect(claimed.status).toBe("UNKNOWN");
    expect(claimed.source).toBe("supplier-feed");
    expect(claimed.sourceReliability).toBe("UNVERIFIED");
    expect(claimed.quantity).toBeNull();
    expect(claimed.saleable).toBe(false);
    expect(claimed.purchasable).toBe(false);
    expect(claimed.available).toBe(false);
    expect(claimed.callerFlagIgnored).toBe(true);
    expect(claimed.reserved).toBe(false);
    expect(claimed.purchased).toBe(false);
    expect(claimed.reasons).toContain("SALES_CLOSED");
    expect(claimed.productionReady).toBe(false);
  });

  it("blocks stale, conflicting, and foreign stock", () => {
    const stale = gate.decideStockAuthority(report({ idempotencyKey: "stale-1", observedAt: "2020-01-01T00:00:00.000Z" }));
    expect(stale.code).toBe("STALE_STOCK");
    expect(stale.status).toBe("UNKNOWN");
    expect(stale.quantity).toBeNull();
    expect(stale.saleable).toBe(false);

    const conflict = gate.decideStockAuthority(report({ idempotencyKey: "conflict-1", conflictingQuantity: 1 }));
    expect(conflict.code).toBe("STOCK_CONFLICT");
    expect(conflict.status).toBe("BLOCKED");
    expect(conflict.selectedSource).toBeNull();
    expect(conflict.quantity).toBeNull();

    const france = gate.decideStockAuthority(report({ idempotencyKey: "fr-1", country: "FR", stockCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_STOCK_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.stockCountry).toBe("DE");
    expect(france.countryMatch).toBe(false);
    expect(france.saleable).toBe(false);

    const greece = gate.decideStockAuthority(report({ idempotencyKey: "gr-1", country: "GR", stockCountry: "DE" }));
    expect(greece.country).toBe("EL");
    expect(greece.code).toBe("COUNTRY_STOCK_MISMATCH");
  });

  it("rejects a repeated decision, a synthetic feed, and a failed retry", () => {
    const synthetic = gate.decideStockAuthority(report({ idempotencyKey: "mock-1", synthetic: true, source: "mock" }));
    expect(synthetic.code).toBe("MOCK_NOT_AUTHORITY");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.live).toBe(false);
    expect(synthetic.quantity).toBeNull();
    expect(synthetic.saleable).toBe(false);

    const first = gate.decideStockAuthority(report({ idempotencyKey: "dup-1" }));
    const second = gate.decideStockAuthority(report({ idempotencyKey: "dup-1", quantity: 99, sellable: true }));
    expect(first.code).toBe("STOCK_AUTHORITY_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_STOCK_DECISION");
    expect(second.duplicate).toBe(true);
    expect(second.quantity).toBeNull();
    expect(second.reserved).toBe(false);
    expect(second.purchased).toBe(false);

    const failed = gate.decideStockAuthority(report({ idempotencyKey: "fail-1", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.reservationCreated).toBe(false);
    const again = gate.decideStockAuthority(report({ idempotencyKey: "fail-1", timeout: true }));
    expect(again.code).toBe("DUPLICATE_STOCK_DECISION");
    const retried = gate.retryStockAuthority("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.quantity).toBeNull();
    expect(retried.saleable).toBe(false);
    expect(retried.reserved).toBe(false);
    expect(retried.purchased).toBe(false);
    expect(gate.retryStockAuthority("missing-authority").code).toBe("RETRY_UNKNOWN");
  });
});
