import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Buzzard record sprint 2 — market, feed, GPS honesty", () => {
  it("unknown market and non-EUR FX do not approve a sale", () => {
    const software = require("../lib/software");
    const unknown = software.pricing.quoteForMarket({
      market: "XX",
      supplierCost: 10,
      shippingCost: 2,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.saleApproved).toBe(false);
    expect(unknown.invented).toBe(false);
    expect(unknown.reason).toBe("UNKNOWN_MARKET");

    const fx = software.pricing.quoteForMarket({
      market: "TR",
      currency: "TRY",
      supplierCost: 10,
      shippingCost: 2,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
    });
    expect(fx.ok).toBe(false);
    expect(fx.conversionInvented).toBe(false);
    expect(fx.reason).toBe("MARKET_FX_UNSUPPORTED");

    const de = software.pricing.quoteForMarket({
      market: "DE",
      locale: "tr",
      supplierCost: 10,
      shippingCost: 2,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
    });
    expect(de.ok).toBe(true);
    expect(de.saleApproved).toBe(true);
    expect(de.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(de.languageIndependentFromMarket).toBe(true);
    expect(de.vatLive).toBe(false);
    expect(de.marketUndercut.implemented).toBe(false);
  });

  it("marketplace feed export stays dry-run and unpublished", () => {
    const software = require("../lib/software");
    const blocked = software.marketplace.exportFeedDryRun({
      channel: "amazon",
      live: true,
      products: [{ sku: "X", price: 9, category: "bremsen" }],
    });
    expect(blocked.pushed).toBe(false);
    expect(blocked.reason).toBe("FEED_EXPORT_LIVE_BLOCKED");
    const dry = software.marketplace.exportFeedDryRun({
      channel: "amazon",
      products: [{ sku: "BR-2", price: 12, category: "bremsen" }],
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.pushed).toBe(false);
    expect(dry.written).toBe(false);
    expect(dry.rows[0].published).toBe(false);
    expect(dry.rows[0].inventedCategory).toBe(false);
  });

  it("future timestamps and sourceId conflicts fail supplier preview", () => {
    const software = require("../lib/software");
    const future = new Date(Date.now() + 86400000).toISOString();
    const preview = software.supplierFeeds.preview({
      format: "json",
      payload: [
        { sku: "N1", price: 4, supplier_cost: 2, currency: "EUR", stock: 3, timestamp: future, source_id: "s1" },
        { sku: "N2", price: 5, supplier_cost: 2, currency: "EUR", stock: 3, timestamp: new Date().toISOString(), source_id: "s1" },
      ],
    });
    expect(preview.written).toBe(false);
    expect(preview.live).toBe(false);
    expect(preview.ok).toBe(false);
    expect(preview.errors.some((row) => row.code === "TIMESTAMP_FUTURE")).toBe(true);
    expect(preview.sourceIdConflicts.length).toBeGreaterThan(0);
  });

  it("shipment GPS claims without telematics do not authorize movement", () => {
    const software = require("../lib/software");
    const eta = software.eta.evaluateShipment({
      status: "IN_TRANSIT",
      lastUpdate: new Date().toISOString(),
      latitude: 52.5,
      longitude: 13.4,
    });
    expect(eta.ok).toBe(false);
    expect(eta.gps).toBe(false);
    expect(eta.reason).toBe("GPS_CLAIM_WITHOUT_TELEMATICS");

    const db = require("../lib/db").db;
    software.initialize(db);
    const gate = software.secureCommerce.shipmentGate
      ? software.secureCommerce.shipmentGate.evaluate(db, {
          telematicsAuthorized: false,
          locationType: "carrier_gps",
          confirmationRequired: false,
        })
      : require("../lib/software/shipmentGate").evaluate(db, {
          telematicsAuthorized: false,
          locationType: "carrier_gps",
          confirmationRequired: false,
        });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("GPS_NOT_AUTHORITATIVE");
    expect(gate.shipmentCreated).toBe(false);
  });

  it("missing locale strings fallback to de without inventing copy", () => {
    const software = require("../lib/software");
    const missing = software.localeCoverage.resolveMessage({
      locale: "ar",
      key: "order.shipped",
      catalog: { de: "Versendet" },
    });
    expect(missing.fallbackUsed).toBe(true);
    expect(missing.invented).toBe(false);
    expect(missing.value).toBe("Versendet");
    const none = software.localeCoverage.resolveMessage({
      locale: "ar",
      key: "order.shipped",
      catalog: {},
    });
    expect(none.ok).toBe(false);
    expect(none.invented).toBe(false);
  });
});
