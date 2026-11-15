import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/supplier/supplierSnapshotGate.js");

const fresh = new Date().toISOString();

function snap(extra = {}) {
  return {
    supplierId: "sup-1",
    sku: "BZ-SNAP-1",
    productSku: "BZ-SNAP-1",
    productId: "prod-1",
    country: "DE",
    priceCountry: "DE",
    stockCountry: "DE",
    currency: "EUR",
    observedAt: fresh,
    price: 12,
    qty: 4,
    priceVerified: true,
    stockVerified: true,
    live: true,
    ...extra,
  };
}

describe("a supplier snapshot is not a live feed", () => {
  it("checks identity, currency, price, and stock independently", () => {
    const mismatch = gate.planSupplierSnapshot(snap({ idempotencyKey: "rel-1", productSku: "OTHER", currency: "euro" }));
    expect(mismatch.code).toBe("SUPPLIER_SNAPSHOT_MISMATCH");
    expect(mismatch.sku).toBeNull();
    expect(mismatch.price).toBeNull();
    expect(mismatch.qty).toBe("UNKNOWN");
    expect(mismatch.currency).toBeNull();

    const currency = gate.planSupplierSnapshot(snap({ idempotencyKey: "cur-1", currency: "" }));
    expect(currency.code).toBe("CURRENCY_UNKNOWN");
    expect(currency.currencyStatus).toBe("UNKNOWN");

    const partial = gate.planSupplierSnapshot(snap({ idempotencyKey: "price-only", qty: undefined }));
    expect(partial.code).toBe("SUPPLIER_SNAPSHOT_UNVERIFIED");
    expect(partial.priceStatus).toBe("UNKNOWN");
    expect(partial.priceVerified).toBe(false);
    expect(partial.price).toBeNull();
    expect(partial.stockStatus).toBe("UNKNOWN");
    expect(partial.stockVerified).toBe(false);
    expect(partial.qty).toBe("UNKNOWN");
    expect(partial.callerFlagIgnored).toBe(true);
    expect(partial.reasons).toEqual(expect.arrayContaining(["PRICE_UNVERIFIED", "STOCK_UNVERIFIED", "SALES_CLOSED"]));
  });

  it("rejects a stale snapshot and does not move one country's figures to another", () => {
    const stale = gate.planSupplierSnapshot(snap({ idempotencyKey: "stale-1", observedAt: "2020-01-01T00:00:00.000Z" }));
    expect(stale.code).toBe("STALE_SNAPSHOT");
    expect(stale.status).toBe("UNKNOWN");
    expect(stale.current).toBe(false);
    expect(stale.price).toBeNull();
    expect(stale.qty).toBe("UNKNOWN");

    const france = gate.planSupplierSnapshot(snap({
      idempotencyKey: "fr-1",
      country: "FR",
      priceCountry: "DE",
      stockCountry: "DE",
    }));
    expect(france.code).toBe("PRICE_COUNTRY_MISMATCH");
    expect(france.reasons).toContain("STOCK_COUNTRY_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.priceCountry).toBe("DE");
    expect(france.stockCountry).toBe("DE");
    expect(france.countryMatch).toBe(false);
    expect(france.price).toBeNull();
    expect(france.qty).toBe("UNKNOWN");

    const greece = gate.planSupplierSnapshot(snap({ idempotencyKey: "gr-1", country: "GR", stockCountry: "DE", priceCountry: "EL" }));
    expect(greece.country).toBe("EL");
    expect(greece.reasons).toContain("STOCK_COUNTRY_MISMATCH");
    expect(greece.reasons).not.toContain("PRICE_COUNTRY_MISMATCH");
  });

  it("does not choose between conflicts or turn a snapshot into an order", () => {
    const conflict = gate.planSupplierSnapshot(snap({ idempotencyKey: "conflict-1", conflictingPrice: 15, conflictingQty: 9 }));
    expect(conflict.code).toBe("SNAPSHOT_CONFLICT");
    expect(conflict.selectedSource).toBeNull();
    expect(conflict.price).toBeNull();
    expect(conflict.qty).toBe("UNKNOWN");
    expect(conflict.orderCreated).toBe(false);
    expect(conflict.purchased).toBe(false);
    expect(conflict.reserved).toBe(false);

    const synthetic = gate.planSupplierSnapshot(snap({ idempotencyKey: "mock-1", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_SUPPLIER");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.live).toBe(false);
    expect(synthetic.price).toBeNull();

    const first = gate.planSupplierSnapshot(snap({ idempotencyKey: "dup-1" }));
    const second = gate.planSupplierSnapshot(snap({ idempotencyKey: "dup-1", price: 99 }));
    expect(first.code).toBe("SUPPLIER_SNAPSHOT_UNVERIFIED");
    expect(first.productionReady).toBe(false);
    expect(second.code).toBe("DUPLICATE_SNAPSHOT");
    expect(second.duplicate).toBe(true);
    expect(second.price).toBeNull();
    expect(second.purchased).toBe(false);
  });

  it("retries a failed snapshot without reserving stock", () => {
    const failed = gate.planSupplierSnapshot(snap({ idempotencyKey: "fail-1", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.qty).toBe("UNKNOWN");
    expect(failed.price).toBeNull();
    expect(failed.reserved).toBe(false);
    const again = gate.planSupplierSnapshot(snap({ idempotencyKey: "fail-1", timeout: true }));
    expect(again.code).toBe("DUPLICATE_SNAPSHOT");
    const retried = gate.retrySupplierSnapshot("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.qty).toBe("UNKNOWN");
    expect(retried.orderCreated).toBe(false);
    expect(retried.purchased).toBe(false);
    expect(retried.reserved).toBe(false);
    expect(gate.retrySupplierSnapshot("missing-snapshot").code).toBe("RETRY_UNKNOWN");
  });
});
