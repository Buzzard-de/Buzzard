import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";

const root = mkdtempSync(path.join(tmpdir(), "buzzard-item56-"));
process.env.BUZZARD_DB_PATH = path.join(root, "catalog.sqlite");
process.env.BUZZARD_SALES_ENABLED = "0";
process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "1";
process.env.BUZZARD_PRODUCT_SOT_ACTIVE = "1";
delete process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE;

const require = createRequire(import.meta.url);
const productCore = require("../lib/pim/productCore");
const { validateProduct, VALID_LOCALES } = require("../lib/productValidator");
const { isSotActive } = require("../lib/productSot");
const { evaluateOffer, MIN_NET_PROFIT_EUR } = require("../lib/commerce/pricingPolicy");
const { isSupplierOrdersBlocked } = require("../lib/supplier/supplierSafetyGate");
const { CsvSupplierAdapter } = require("../lib/supplier/csvSupplierAdapter");
const { importSupplierFeed } = require("../lib/supplier/supplierImportPipeline");
const { inspectFeeds } = require("../lib/buzzardNative/core/specialists/stockEngine");
const { calculateShipping, getProviderHealth } = require("../lib/commerce/shippingProvider");
const { validateHubSeoCoverage, PRIMARY } = require("../lib/storefront/hubSeoLocaleService");

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("items 56-84 catalog and supplier controls", () => {
  it("creates and reads a draft product without activating the source of truth", () => {
    const sku = `item56-${Date.now()}`;
    const created = productCore.createProduct({ sku, title: "Regalblech Satz", price: 12.5, currency: "EUR" }, { actorId: "item56" });
    const read = productCore.getProduct(created.id);
    expect(read.sku).toBe(sku);
    expect(read.title).toBe("Regalblech Satz");
    expect(read.status).toBe("DRAFT");
    expect(read.currency).toBe("EUR");
    expect(isSotActive()).toBe(false);
    expect(() => productCore.createProduct({ sku, title: "again" }, { actorId: "item56" })).toThrow();
  });

  it("keeps four locale labels and a low-confidence customs review", () => {
    expect(PRIMARY).toEqual(["de", "en", "tr", "ar"]);
    const coverage = validateHubSeoCoverage();
    expect(coverage.activeHubs).toBe(50);
    expect(coverage.missingPrimary).toEqual([]);
    expect(coverage.completeClaim).toBe(false);
    expect([...VALID_LOCALES].sort()).toEqual(["ar", "de", "en", "tr"]);
    const validated = validateProduct({
      sku: "REG-CUSTOMS",
      name: "Regalblech",
      supplier_id: "csv-supplier-dry",
      supplier_sku: "REG-CUSTOMS",
      customs: { gtip: "8708", confidence: 0.2, origin_country: "de" },
    });
    expect(validated.ok).toBe(true);
    expect(validated.product.customs.review_required).toBe(true);
    expect(validated.product.customs.origin_country).toBe("DE");
  });

  it("rejects a price below the minimum net profit and does not write a live price", () => {
    const low = evaluateOffer({
      offerPrice: 10,
      comparableMarketPrice: 90,
      supplierCost: 9.8,
      categoryMargin: 0.01,
    });
    expect(MIN_NET_PROFIT_EUR).toBe(0.5);
    expect(low.ok).toBe(false);
    expect(low.reasons).toContain("MIN_NET_PROFIT");
    expect(low.livePriceWrite).toBe(false);
    expect(low.salesEnabled).toBe(false);
    const high = evaluateOffer({
      offerPrice: 80,
      comparableMarketPrice: 90,
      supplierCost: 40,
      categoryMargin: 0.07,
    });
    expect(high.reasons).not.toContain("ABOVE_UNDERCUT_TARGET");
  });

  it("blocks supplier orders, live fetch, and stale stock while sales are off", async () => {
    expect(isSupplierOrdersBlocked()).toBe(true);
    const adapter = new CsvSupplierAdapter();
    await expect(adapter.fetchProducts()).rejects.toThrow(/blocked/i);
    const dry = await adapter.fetchProductsDryRun();
    expect(dry.live).toBe(false);
    expect(dry.dryRun).toBe(true);
    const feed = importSupplierFeed({
      supplierId: "csv-supplier-dry",
      format: "csv",
      records: [{ sku: "REG-1", title: "Regal", price: 12, currency: "EUR", category: "automotive" }],
    });
    expect(feed.pimWrite).toBe(false);
    expect(feed.live).toBe(false);
    const stock = inspectFeeds({
      actorId: "stock_ai",
      feeds: [{ supplier: "csv", sku: "REG-1", qty: "nope", updatedAt: Date.now() - 48 * 36e5 }],
    });
    expect(stock.liveSupplierApi).toBe(false);
    expect(stock.sellable).toBe(false);
    expect(stock.stale.length).toBe(1);
  });

  it("quotes local shipping without creating a shipment", () => {
    const quote = calculateShipping({ methodId: "standard", country: "DE", subtotal: 20, itemCount: 1 });
    expect(quote.currency).toBe("EUR");
    expect(quote.dryRun).toBe(true);
    expect(quote.shipmentCreated).toBe(false);
    expect(getProviderHealth().realShipmentEnabled).toBe(false);
  });
});
