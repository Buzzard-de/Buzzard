import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("commerce integrity — tax, exceptions, reservation", () => {
  let taxProvider;
  let commercialIntegrations;
  let customerCheckout;
  let pusat;
  let inventory;
  let db;
  let software;

  beforeAll(() => {
    taxProvider = require("../lib/commerce/taxProvider");
    commercialIntegrations = require("../lib/commercialIntegrations");
    customerCheckout = require("../lib/customerCheckout");
    pusat = require("../lib/pusat");
    inventory = require("../lib/software/inventory");
    db = require("../lib/db").db;
    software = require("../lib/software");
    software.initialize(db);
  });

  it("does not invent VAT for unknown countries or categories", () => {
    const unknown = taxProvider.calculateTax({ country: "XX", subtotal: 100 });
    expect(unknown.ok).toBe(false);
    expect(unknown.blocked).toBe(true);
    expect(unknown.invented).toBe(false);
    expect(unknown.code).toBe("tax_rate_unknown");

    const missingCountry = taxProvider.calculateTax({ subtotal: 100 });
    expect(missingCountry.ok).toBe(false);
    expect(missingCountry.code).toBe("tax_rate_unknown");

    const category = taxProvider.calculateTax({ country: "DE", subtotal: 100, category: "tires" });
    expect(category.ok).toBe(false);
    expect(category.code).toBe("tax_category_rate_unknown");
    expect(category.invented).toBe(false);

    const known = taxProvider.calculateTax({ country: "DE", subtotal: 100 });
    expect(known.ok).toBe(true);
    expect(known.rate).toBe(19);
    expect(known.tax).toBe(19);

    const syncUnknown = commercialIntegrations.calculateTaxSync("XX", 50, 5);
    expect(syncUnknown.ok).toBe(false);
    expect(syncUnknown.invented).toBe(false);
    expect(syncUnknown.tax).toBeNull();

    const quoteUnknown = customerCheckout.calculateCheckoutQuote({
      countryCode: "XX",
      subtotal: 40,
    });
    expect(quoteUnknown.ok).toBe(false);
    expect(["tax_rate_unknown", "shipping_method_unknown"]).toContain(quoteUnknown.code);
    expect(quoteUnknown.invented).toBe(false);
    expect(customerCheckout.getTaxRate("XX")).toBeNull();
  });

  it("classifies auth/rate-limit as non-retryable and redacts secrets", () => {
    const auth = pusat.exceptions.classify(new Error("401 unauthorized"), { action: "prices.update" });
    expect(auth.code).toBe("PUSAT_AUTH_FAILED");
    expect(auth.retryable).toBe(false);

    const limit = pusat.exceptions.classify(new Error("429 rate limit"), { action: "prices.update" });
    expect(limit.code).toBe("PUSAT_RATE_LIMIT");
    expect(limit.retryable).toBe(false);

    const missingGeneric = pusat.exceptions.classify(new Error("row missing"), { action: "prices.update" });
    expect(missingGeneric.code).not.toBe("PUSAT_MISSING_COST");

    const recorded = pusat.exceptions.recordException({
      code: "PUSAT_AUTH_FAILED",
      taskId: "task_exc_secret",
      retryable: false,
      lastError: "provider failed api_key=sk-live-secret token=abc",
    });
    expect(recorded.lastError).toBe("PUSAT_AUTH_FAILED");
    expect(JSON.stringify(recorded)).not.toContain("sk-live-secret");
    expect(JSON.stringify(recorded)).not.toContain("api_key=");
  });

  it("expires stale reservations and refuses estimated stock", () => {
    const sku = `SKU-EXP-${Date.now()}`;
    const blocked = inventory.reserve(db, {
      sku,
      requestQuantity: 1,
      source: "estimate",
      quantity: 10,
      lastSupplierUpdate: new Date().toISOString(),
    });
    expect(blocked.reserved).toBe(false);
    expect(blocked.failClosed).toBe(true);

    const held = inventory.reserve(db, {
      sku,
      requestQuantity: 1,
      source: "supplier_feed",
      quantity: 5,
      lastSupplierUpdate: new Date().toISOString(),
      idempotencyKey: `res-${sku}`,
    });
    expect(held.ok).toBe(true);
    expect(held.reserved).toBe(true);

    db.prepare("UPDATE software_reservations SET created_at = ? WHERE id = ?").run(
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      held.reservation.id
    );
    const expired = inventory.expireDue(db, { sku, olderThanMs: 10 * 60 * 1000 });
    expect(expired.ok).toBe(true);
    expect(expired.expired).toBeGreaterThanOrEqual(1);

    const row = db.prepare("SELECT status FROM software_reservations WHERE id = ?").get(held.reservation.id);
    expect(row.status).toBe("EXPIRED");
    expect(inventory.reservedQuantity(db, sku)).toBe(0);
  });

  it("keeps the 0.50 EUR floor and does not implement 0.10 undercut", () => {
    const quote = software.pricing.quote({
      supplierCost: 10,
      shippingCost: 2,
      extraCosts: 0,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
      taxRate: 0.19,
    });
    expect(quote.ok).toBe(true);
    expect(quote.minNetProfitEur).toBe(0.5);
    expect(quote.marketUndercut.implemented).toBe(false);
    expect(quote.precise).toBe(true);
    expect(quote.netProfit).toBeGreaterThanOrEqual(0.5);
  });
});
