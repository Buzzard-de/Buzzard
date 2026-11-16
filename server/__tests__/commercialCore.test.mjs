import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateEan } = require("../lib/productValidator.js");
const { ApiSupplierAdapter } = require("../lib/supplier/apiSupplierAdapter.js");
const { XmlSupplierAdapter } = require("../lib/supplier/xmlSupplierAdapter.js");
const { CsvSupplierAdapter } = require("../lib/supplier/csvSupplierAdapter.js");
const {
  runCommercialDryRun,
  quoteCommercialPrice,
  evaluateCommercialStock,
  targetMarginForCategory,
  DECISIONS,
} = require("../lib/commerce/commercialCore.js");

function ean13(prefix12) {
  for (let digit = 0; digit < 10; digit += 1) {
    const candidate = `${prefix12}${digit}`;
    const result = validateEan(candidate);
    if (result.ok && !result.warning) return candidate;
  }
  throw new Error(`no checksum for ${prefix12}`);
}

const FRESH = new Date().toISOString();
const STALE = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
const IMAGE = ["https://cdn.test-supplier.example.de/p85073.jpg"];

function priced(overrides = {}) {
  return {
    name: "Bremsbelag Set Vorderachse",
    description: "Synthetic dry-run brake pad set for catalog review.",
    ean_gtin: ean13("590123412345"),
    mpn: "P85073",
    brand: "ATE",
    supplier_category: "automotive/bremssystem",
    supplier_price: { amount: 40, currency: "EUR" },
    shipping_cost: 6,
    marketplace_fee: 4,
    payment_fee: 1.2,
    return_reserve: 1,
    other_cost: 0,
    comparable_market_price: 90,
    stock: 12,
    reserved_stock: 2,
    stock_updated_at: FRESH,
    country: "DE",
    images: IMAGE,
    ...overrides,
  };
}

describe("commercial price and stock rules", () => {
  it("keeps automotive, default, and drinks margins distinct", () => {
    expect(targetMarginForCategory({ activeCategoryId: "cat-05", slug: "automotive" })).toBe(0.11);
    expect(targetMarginForCategory({ activeCategoryId: "cat-01", slug: "textil" })).toBe(0.07);
    expect(targetMarginForCategory({ id: "cat-46", slug: "getraenke" })).toBe(0.15);
  });

  it("shows every cost line and keeps VAT out of net profit", () => {
    const price = quoteCommercialPrice({
      supplierCost: 40,
      shippingCost: 6,
      marketplaceFee: 4,
      paymentFee: 1.2,
      returnReserve: 1,
      otherCost: 0,
      comparableMarketPrice: 90,
      country: "DE",
      category: { activeCategoryId: "cat-05", slug: "automotive" },
    });
    expect(price.ok).toBe(true);
    expect(price.supplierCost).toBe(40);
    expect(price.shippingCost).toBe(6);
    expect(price.marketplaceFee).toBe(4);
    expect(price.paymentFee).toBe(1.2);
    expect(price.returnReserve).toBe(1);
    expect(price.otherCost).toBe(0);
    expect(price.vat).toBeGreaterThan(0);
    expect(price.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(price.profitMargin).toBeGreaterThanOrEqual(11);
    expect(price.finalRecommendedPrice).toBeLessThanOrEqual(89.9);
    expect(price.realizedProfit).toBe(price.netProfit);
    expect(price.salesEnabled).toBe(false);
  });

  it("does not invent a missing cost and does not book an unreimbursed return", () => {
    const missing = quoteCommercialPrice({
      supplierCost: 40,
      comparableMarketPrice: 90,
      category: { slug: "automotive", activeCategoryId: "cat-05" },
    });
    expect(missing.code).toBe(DECISIONS.SUPPLIER_DATA_INCOMPLETE);
    expect(missing.unknown).toEqual(expect.arrayContaining(["shippingCost", "marketplaceFee", "paymentFee", "returnReserve", "otherCost"]));
    expect(missing.finalRecommendedPrice).toBeNull();

    const returned = quoteCommercialPrice({
      supplierCost: 40,
      shippingCost: 6,
      marketplaceFee: 4,
      paymentFee: 1.2,
      returnReserve: 1,
      otherCost: 0,
      comparableMarketPrice: 90,
      country: "DE",
      category: { activeCategoryId: "cat-05", slug: "automotive" },
      returnOccurred: true,
      supplierReimbursedReturn: false,
    });
    expect(returned.realizedProfit).toBeNull();
    expect(returned.estimatedProfit).toEqual(expect.any(Number));
    expect(returned.code).toBe(DECISIONS.PRICE_NOT_VIABLE);
  });

  it("marks a market price that cannot fund the minimum profit as not viable", () => {
    const price = quoteCommercialPrice({
      supplierCost: 40,
      shippingCost: 6,
      marketplaceFee: 4,
      paymentFee: 1.2,
      returnReserve: 1,
      otherCost: 0,
      comparableMarketPrice: 55,
      country: "DE",
      category: { activeCategoryId: "cat-05", slug: "automotive" },
    });
    expect(price.code).toBe(DECISIONS.PRICE_NOT_VIABLE);
    expect(price.finalRecommendedPrice).toBeNull();
  });

  it("refuses stale, missing, and negative stock as sellable stock", () => {
    const fresh = evaluateCommercialStock({ supplierStock: 12, reservedStock: 2, updatedAt: FRESH });
    expect(fresh.sellable).toBe(true);
    expect(fresh.availableStock).toBe(10);
    expect(fresh.supplierStock).toBe(12);
    expect(fresh.confidence).toBe("HIGH");
    expect(fresh.sync).toMatchObject({ mode: "DRY_RUN", liveSync: false, purchase: false });

    const stale = evaluateCommercialStock({ supplierStock: 12, reservedStock: 0, updatedAt: STALE });
    expect(stale.sellable).toBe(false);
    expect(stale.availableStock).toBe(0);
    expect(stale.code).toBe(DECISIONS.SUPPLIER_DATA_INCOMPLETE);

    const negative = evaluateCommercialStock({ supplierStock: -1, reservedStock: 0, updatedAt: FRESH });
    expect(negative.negative).toBe(true);
    expect(negative.sellable).toBe(false);
    expect(negative.code).toBe(DECISIONS.OUT_OF_STOCK);
  });
});

describe("end-to-end commercial dry run", () => {
  it("links API, XML, and CSV fixtures through catalog, price, and stock", () => {
    const api = new ApiSupplierAdapter().normalizeProduct(priced({ supplier_sku: "API-CORE-001" }));
    const xml = new XmlSupplierAdapter().normalizeProduct({
      ...priced({ supplier_sku: "XML-CORE-001", ean_gtin: ean13("400638133393"), mpn: "XML85073" }),
      sku: "XML-CORE-001",
      gtin: ean13("400638133393"),
      title: "Bremsbelag XML",
      category: "automotive/bremssystem",
    });
    const csv = new CsvSupplierAdapter().normalizeProduct({
      ...priced({ supplier_sku: "CSV-CORE-001", ean_gtin: ean13("871234567890"), mpn: "CSV85073" }),
      sku: "CSV-CORE-001",
      ean: ean13("871234567890"),
      title: "Bremsbelag CSV",
      category: "automotive/bremssystem",
    });

    const result = runCommercialDryRun({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [
        { ...api, ...priced({ supplier_sku: "API-CORE-001" }) },
        { ...xml, ...priced({ supplier_sku: "XML-CORE-001", ean_gtin: ean13("400638133393"), mpn: "XML85073" }) },
        { ...csv, ...priced({ supplier_sku: "CSV-CORE-001", ean_gtin: ean13("871234567890"), mpn: "CSV85073" }) },
        priced({ supplier_sku: "RET-CORE-001", ean_gtin: ean13("501234567890"), supplier_category: "cat-25" }),
        priced({ supplier_sku: "HUB-CORE-001", ean_gtin: ean13("400000000000"), supplier_category: "cat-54" }),
        priced({ supplier_sku: "AMB-CORE-001", ean_gtin: ean13("422222222222"), supplier_category: "bz.12" }),
        priced({ supplier_sku: "LOW-CORE-001", ean_gtin: ean13("333333333333"), comparable_market_price: 55 }),
        priced({ supplier_sku: "ZERO-CORE-001", ean_gtin: ean13("222222222222"), stock: 0 }),
        priced({ supplier_sku: "OLD-CORE-001", ean_gtin: ean13("111111111111"), stock_updated_at: STALE }),
        priced({ supplier_sku: "API-CORE-001", ean_gtin: ean13("555555555555"), mpn: "P85099" }),
        priced({ supplier_sku: "GAP-CORE-001", ean_gtin: ean13("666666666666"), description: "" }),
      ],
    });

    expect(result.dryRun).toBe(true);
    expect(result.live).toBe(false);
    expect(result.salesEnabled).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.pimWrite).toBe(false);
    expect(result.priceUpdated).toBe(false);
    expect(result.stockUpdated).toBe(false);
    expect(result.salesGate).toBe("LOCKED");
    expect(result.stages).toEqual([
      "SUPPLIER",
      "NORMALIZATION",
      "VALIDATION",
      "CATEGORY_MAPPING",
      "DUPLICATE_DETECTION",
      "PRODUCT_CATALOG",
      "PRICE_ENGINE",
      "STOCK_ENGINE",
      "MARKET_READINESS",
      "DRY_RUN_RESULT",
    ]);

    const ready = result.products.filter((item) => item.decision === DECISIONS.READY_FOR_REVIEW);
    expect(ready).toHaveLength(3);
    expect(ready.map((item) => item.catalog.sku).sort()).toEqual(["API-CORE-001", "CSV-CORE-001", "XML-CORE-001"]);
    expect(ready[0].catalog).toMatchObject({
      brand: "ATE",
      supplierId: "api-supplier-dry",
      buzzardCategoryId: "cat-05",
      subcategoryId: "cat-05-03",
      currency: "EUR",
      supplierCost: 40,
      supplierStock: 12,
      validationStatus: "READY_FOR_REVIEW",
      published: false,
      pimWrite: false,
    });
    expect(ready[0].price.finalRecommendedPrice).toEqual(expect.any(Number));
    expect(ready[0].price.vat).toEqual(expect.any(Number));
    expect(ready[0].stock.availableStock).toBe(10);
    expect(ready[0].stock.sync.mode).toBe("DRY_RUN");

    const bySku = Object.fromEntries(result.products.map((item) => [item.catalog?.sku || item.code, item]));
    expect(result.products.find((item) => item.code === "CATEGORY_RETIRED").decision).toBe(DECISIONS.CATEGORY_REVIEW_REQUIRED);
    expect(result.products.find((item) => item.code === "CATEGORY_HUB").decision).toBe(DECISIONS.CATEGORY_REVIEW_REQUIRED);
    expect(result.products.find((item) => item.code === "CATEGORY_AMBIGUOUS").decision).toBe(DECISIONS.CATEGORY_REVIEW_REQUIRED);
    expect(result.products.find((item) => item.catalog?.sku === "LOW-CORE-001").decision).toBe(DECISIONS.PRICE_NOT_VIABLE);
    expect(result.products.find((item) => item.catalog?.sku === "ZERO-CORE-001").decision).toBe(DECISIONS.OUT_OF_STOCK);
    expect(result.products.find((item) => item.catalog?.sku === "OLD-CORE-001").decision).toBe(DECISIONS.SUPPLIER_DATA_INCOMPLETE);
    expect(result.products.find((item) => item.catalog?.sku === "GAP-CORE-001").decision).toBe(DECISIONS.INVALID_PRODUCT);
    const duplicate = result.products.find((item) => item.decision === DECISIONS.DUPLICATE_PRODUCT);
    expect(duplicate.merged).toBe(false);
    expect(duplicate.catalog).toBeNull();
    expect(bySku).toBeTruthy();
    expect(require.cache[require.resolve("../lib/db.js")]).toBeUndefined();
  });
});
