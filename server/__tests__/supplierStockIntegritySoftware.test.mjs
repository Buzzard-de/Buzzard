import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("supplier and stock infrastructure — established fail-closed", () => {
  it("keeps sales off, supplier orders off, own-stock buy off, and undercut unimplemented", () => {
    const software = require("../lib/software");
    const inspect = software.supplierStockIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.supplierOrdersEnabled).toBe(false);
    expect(inspect.purchaseOwnStock).toBe(false);
    expect(inspect.minNetProfitEur).toBe(0.5);
    expect(inspect.marketUndercutImplemented).toBe(false);
    expect(inspect.sharedReservationAuthority).toBe(false);
    expect(software.supplierStockIntegrity.applyUndercut().reason).toBe("MARKET_UNDERCUT_NOT_IMPLEMENTED");
    expect(software.supplierStockIntegrity.applyUndercut().applied).toBe(false);
  });

  it("never sends a purchase order or fetches a live supplier feed", () => {
    const { supplierStockIntegrity } = require("../lib/software");
    const po = supplierStockIntegrity.purchaseOrder({ forcePurchase: true, actor: "operator" });
    expect(po.reason).toBe("LIVE_PO_BLOCKED");
    expect(po.sent).toBe(false);
    expect(po.httpAttempted).toBe(false);
    const fetch = supplierStockIntegrity.fetchLiveFeed({ url: "https://supplier.example/feed.csv" });
    expect(fetch.reason).toBe("LIVE_FETCH_BLOCKED");
    expect(fetch.written).toBe(false);
    const preview = supplierStockIntegrity.importLiveFeed({
      format: "json",
      payload: JSON.stringify([{ sku: "S-1", price: 1, currency: "EUR", timestamp: new Date().toISOString() }]),
    });
    expect(preview.written).toBe(false);
    expect(preview.live).toBe(false);
    expect(supplierStockIntegrity.syncLiveInventory().reason).toBe("LIVE_INVENTORY_SYNC_BLOCKED");
  });

  it("does not treat outage, malformed, stale, or invented quantities as stock", () => {
    const { supplierStockIntegrity } = require("../lib/software");
    expect(supplierStockIntegrity.treatOutageAsStock({ timeout: true }).treatAsStock).toBe(false);
    expect(supplierStockIntegrity.treatOutageAsStock({ malformed: true }).treatAsStock).toBe(false);
    expect(supplierStockIntegrity.inventStock().reason).toBe("INVENTED_STOCK_BLOCKED");
    expect(supplierStockIntegrity.confirmLiveStock().reason).toBe("LIVE_STOCK_UNKNOWN");
    const stale = supplierStockIntegrity.classifyAvailability(
      { sku: "S-1", stock: 12, timestamp: "2020-01-01T00:00:00Z" },
      { staleAfterMs: 1000 }
    );
    expect(stale.treatAsStock).toBe(false);
    expect(stale.purchasable).toBe(false);
    const local = supplierStockIntegrity.evaluateLocalStock({ stock: 4, source: "unverified" });
    expect(local.invented).toBe(false);
    expect(local.purchaseOwnStock).toBe(false);
  });

  it("quotes EUR with €0.50 floor, no invented FX, and no €0.10 undercut", () => {
    const { supplierStockIntegrity } = require("../lib/software");
    const missing = supplierStockIntegrity.quoteProfit({});
    expect(missing.reason).toBe("MISSING_SUPPLIER_COST");
    const quoted = supplierStockIntegrity.quoteProfit({
      supplierCost: 10,
      shippingCost: 1,
      extraCosts: 0,
      returnReserve: 0,
      marketplaceCommissionRate: 0,
      taxRate: 0.19,
    });
    expect(quoted.ok).toBe(true);
    expect(quoted.minNetProfitEur).toBe(0.5);
    expect(quoted.undercutApplied).toBe(false);
    expect(quoted.netProfit + 1e-9).toBeGreaterThanOrEqual(0.5);
    expect(supplierStockIntegrity.convertCurrency({ from: "EUR", to: "USD" }).reason).toBe("FX_RATE_NOT_INVENTED");
    const snap = supplierStockIntegrity.priceSnapshot({
      supplierCost: 10,
      shippingCost: 0,
      extraCosts: 0,
      returnReserve: 0,
      marketplaceCommissionRate: 0,
      taxRate: 0,
    });
    expect(snap.liveVerified).toBe(false);
    expect(snap.invented).toBe(false);
  });

  it("keeps Inter-Cars and TecDoc external, connectors honest, authorities split, financial no-retry", () => {
    const { supplierStockIntegrity } = require("../lib/software");
    const honesty = supplierStockIntegrity.connectorHonesty();
    expect(honesty.liveReady).toBe(false);
    expect(honesty.interCars.blocked).toBe("BLOCKED_EXTERNAL_DEPENDENCY");
    expect(honesty.tecdoc.blocked).toBe("BLOCKED_EXTERNAL_DEPENDENCY");
    expect(honesty.interCars.httpAttempted).toBe(false);
    const ic = supplierStockIntegrity.confirmInterCarsLive();
    expect(ic.purchaseReason).toBe("LIVE_PO_BLOCKED");
    expect(ic.availabilityReason).toBe("LIVE_STOCK_UNKNOWN");
    expect(supplierStockIntegrity.confirmTecDocLive().reason).toBe("LIVE_TECDOC_UNKNOWN");
    expect(supplierStockIntegrity.reservationAuthorities().sharedAuthority).toBe(false);
    expect(supplierStockIntegrity.retryPolicy("purchase_order").retry).toBe(false);
    expect(supplierStockIntegrity.retryPolicy("feed_preview").retry).toBe(true);
  });
});
