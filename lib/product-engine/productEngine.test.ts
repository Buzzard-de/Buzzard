import { describe, it, expect, beforeEach } from "vitest";
import {
  FIXTURE_PRODUCT_IDS,
  addSupplierOffer,
  aggregateSupplierStock,
  buildProductPricing,
  calculateProductDisplayPrice,
  clearProductEvents,
  compareProducts,
  createProductSnapshot,
  createSupplierOffer,
  findDuplicateProduct,
  getProduct,
  getProductByEan,
  getProductBySku,
  getProductEvents,
  getProductsByCategory,
  getProductsForMarket,
  getRegistryCount,
  getTranslationForLocale,
  ingestSupplierProduct,
  isProductAvailableInMarket,
  loadFixtureProducts,
  normalizeCompatibilityList,
  normalizeSupplierProduct,
  sanitizeClientProductUpdate,
  searchProducts,
  selectBestSupplier,
  setMarketAvailability,
  toTecdocReadyFormat,
  updateProductStock,
  updateProductSupplierOffer,
  validateProduct,
  validateTechnicalConsistency,
} from "./index";
describe("Product Engine — registry", () => {
  it("loads catalog products into registry", () => {
    expect(getRegistryCount()).toBeGreaterThan(0);
  });

  it("resolves all QA fixture products", () => {
    const fixtures = loadFixtureProducts();
    expect(fixtures).toHaveLength(4);
    for (const id of FIXTURE_PRODUCT_IDS) {
      expect(getProduct(id)).toBeDefined();
    }
  });
});

describe("Product Engine — fixture products", () => {
  const fixtures = loadFixtureProducts();

  it("Michelin tire preserves 225/45 R17 in name", () => {
    const tire = fixtures.find((p) => p.productId === "reifen-pilot-sport")!;
    expect(tire.brand).toBe("Michelin");
    const de = getTranslationForLocale(tire.translations, "de");
    expect(de?.name).toContain("225/45 R17");
  });

  it("5W-30 engine oil has automotive category", () => {
    const oil = fixtures.find((p) => p.productId === "motoroel-5w30")!;
    expect(oil.categoryId).toBe("cat-05-01");
    expect(oil.brand).toBe("Castrol");
  });

  it("brake disc 280mm", () => {
    const disc = fixtures.find((p) => p.productId === "bremsscheibe-280")!;
    expect(disc.brand).toBe("ATE");
    const de = getTranslationForLocale(disc.translations, "de");
    expect(de?.name).toContain("280");
  });

  it("brake pads", () => {
    const pads = fixtures.find((p) => p.productId === "bremsbelaege-vorder")!;
    expect(pads.brand).toBe("Bosch");
  });
});

describe("Product Engine — lookup API", () => {
  it("getProductBySku", () => {
    const p = getProductBySku("BUZ-AUTO-000015");
    expect(p?.productId).toBe("reifen-pilot-sport");
  });

  it("getProductByEan", () => {
    const p = getProductByEan("4006633001234");
    expect(p?.productId).toBe("bremsscheibe-280");
  });

  it("searchProducts by brand", () => {
    const results = searchProducts("Michelin");
    expect(results.some((p) => p.productId === "reifen-pilot-sport")).toBe(true);
  });

  it("getProductsByCategory", () => {
    const brakes = getProductsByCategory("cat-05-03");
    expect(brakes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Product Engine — validation", () => {
  it("validates fixture products", () => {
    for (const product of loadFixtureProducts()) {
      const result = validateProduct(product);
      expect(result.errors.filter((e) => e.code === "SKU_MISSING")).toHaveLength(0);
      expect(result.errors.filter((e) => e.code === "BRAND_MISSING")).toHaveLength(0);
    }
  });

  it("invalid product becomes PENDING_REVIEW", () => {
    const product = loadFixtureProducts()[0];
    const invalid = { ...product, sku: "", brand: "" };
    const result = validateProduct(invalid);
    expect(result.valid).toBe(false);
    expect(result.status).toBe("PENDING_REVIEW");
  });
});

describe("Product Engine — translations", () => {
  it("keeps technical values out of translations", () => {
    const tire = getProduct("reifen-pilot-sport")!;
    const de = getTranslationForLocale(tire.translations, "de");
    expect(de?.name).toContain("225/45 R17");
    expect(tire.technicalData).toBeDefined();
  });
});

describe("Product Engine — technical data", () => {
  it("validates viscosity format warning", () => {
    const warnings = validateTechnicalConsistency({ viscosity: "invalid" });
    expect(warnings).toContain("UNUSUAL_VISCOSITY_FORMAT");
  });

  it("preserves 5W-30 in technical context", () => {
    const oil = getProduct("motoroel-5w30")!;
    const de = getTranslationForLocale(oil.translations, "de");
    expect(de?.name).toContain("5W-30");
  });
});

describe("Product Engine — automotive compatibility", () => {
  it("normalizes compatibility entries", () => {
    const entries = normalizeCompatibilityList([
      { make: "BMW", model: "3 Series", year_from: 2015, year_to: 2020, oem_number: "34116860073" },
    ]);
    expect(entries[0].make).toBe("BMW");
    expect(entries[0].oemNumbers).toContain("34116860073");
  });

  it("exports TecDoc-ready format without API", () => {
    const entries = normalizeCompatibilityList([{ make: "VW", model: "Golf", engine: "1.4 TSI" }]);
    const tecdoc = toTecdocReadyFormat(entries);
    expect(tecdoc[0].adapterMode).toBe("MOCK");
  });
});

describe("Product Engine — multi-supplier", () => {
  it("supports multiple supplier offers", () => {
    const product = getProduct("reifen-pilot-sport")!;
    const withSecond = addSupplierOffer(
      product,
      createSupplierOffer({
        supplierId: "SUP-B-002",
        supplierSku: "TIRE-ALT-001",
        supplierPrice: 52,
        currency: "EUR",
        stock: 15,
        source: "SUP-B-002",
        sourceType: "CSV",
      })
    );
    expect(withSecond.supplierOffers).toHaveLength(2);
  });

  it("selectBestSupplier picks lowest price with stock", () => {
    let product = getProduct("reifen-pilot-sport")!;
    product = addSupplierOffer(
      product,
      createSupplierOffer({
        supplierId: "SUP-B-002",
        supplierSku: "TIRE-CHEAP",
        supplierPrice: 45,
        currency: "EUR",
        stock: 10,
        source: "SUP-B-002",
        sourceType: "API",
        reliabilityScore: 0.9,
      })
    );
    const best = selectBestSupplier(product, { countryCode: "DE", supplierRegions: ["EU"] });
    expect(best?.offer.supplierId).toBe("SUP-B-002");
    expect(best!.score).toBeGreaterThan(0);
  });
});

describe("Product Engine — pricing", () => {
  it("builds pricing breakdown", () => {
    const pricing = buildProductPricing(50, { vatRate: 0.19, marginTarget: 0.25, currency: "EUR" });
    expect(pricing.customerPrice).toBeGreaterThan(pricing.supplierCost);
    expect(pricing.currency).toBe("EUR");
  });

  it("integrates with Market Engine calculateDisplayPrice", () => {
    const product = getProduct("motoroel-5w30")!;
    const display = calculateProductDisplayPrice(product, { countryCode: "DE" });
    expect(display.currency).toBe("EUR");
    expect(display.formatted).toBeTruthy();
  });
});

describe("Product Engine — market availability", () => {
  it("Germany ACTIVE, Saudi DISABLED", () => {
    let product = getProduct("reifen-pilot-sport")!;
    product = setMarketAvailability(product, "DE", "ACTIVE");
    product = setMarketAvailability(product, "SA", "DISABLED", "NOT_LAUNCHED");
    expect(isProductAvailableInMarket(product, "DE").available).toBe(true);
    expect(isProductAvailableInMarket(product, "SA").available).toBe(false);
  });

  it("getProductsForMarket filters by availability", () => {
    const product = getProduct("reifen-pilot-sport")!;
    setMarketAvailability(product, "DE", "ACTIVE");
    const deProducts = getProductsForMarket("DE");
    expect(deProducts.some((p) => p.productId === "reifen-pilot-sport")).toBe(true);
  });
});

describe("Product Engine — duplicate detection", () => {
  it("detects EAN duplicate", () => {
    const tire = getProduct("reifen-pilot-sport")!;
    const dup = findDuplicateProduct({ ...tire, productId: "new-id" });
    expect(dup.match).toBe(true);
    expect(dup.method).toBe("ean");
  });

  it("compareProducts by brand+mpn", () => {
    const a = getProduct("bremsscheibe-280")!;
    const b = { ...a, productId: "other" };
    const result = compareProducts(a, b);
    expect(result.match).toBe(true);
  });
});

describe("Product Engine — stock", () => {
  beforeEach(() => clearProductEvents());

  it("OUT_OF_STOCK when quantity zero", () => {
    const product = getProduct("motoroel-5w30")!;
    const updated = updateProductStock(product, 0);
    expect(updated.status).toBe("OUT_OF_STOCK");
    expect(getProductEvents(product.productId).some((e) => e.type === "PRODUCT_OUT_OF_STOCK")).toBe(true);
  });

  it("back in stock when quantity restored", () => {
    let product = getProduct("motoroel-5w30")!;
    product = updateProductStock(product, 0);
    product = updateProductStock(product, 25);
    expect(product.status).toBe("ACTIVE");
    expect(getProductEvents(product.productId).some((e) => e.type === "PRODUCT_BACK_IN_STOCK")).toBe(true);
  });

  it("DISCONTINUED not auto-reactivated", () => {
    let product = getProduct("motoroel-5w30")!;
    product = { ...product, status: "DISCONTINUED" };
    product = updateProductStock(product, 50);
    expect(product.status).toBe("DISCONTINUED");
  });

  it("aggregateSupplierStock sums offers", () => {
    const product = getProduct("reifen-pilot-sport")!;
    expect(aggregateSupplierStock(product)).toBeGreaterThan(0);
  });
});

describe("Product Engine — supplier offer update", () => {
  beforeEach(() => clearProductEvents());

  it("updateSupplierOffer emits events", () => {
    const updated = updateProductSupplierOffer("motoroel-5w30", "SUP-DEMO-001", {
      supplierPrice: 24.5,
      stock: 40,
    });
    expect(updated?.pricing.supplierCost).toBe(24.5);
    expect(getProductEvents("motoroel-5w30").some((e) => e.type === "SUPPLIER_PRICE_UPDATED")).toBe(true);
  });
});

describe("Product Engine — normalization", () => {
  it("normalizes supplier raw data via PIM normalizer", () => {
    const normalized = normalizeSupplierProduct({
      raw: {
        supplier_sku: "SUP-TEST-001",
        title: "Test Brake Pad",
        brand: "Bosch",
        ean: "4006633009999",
        purchase_price: 15,
        currency: "EUR",
        stock: 10,
        supplier_category: "brakes",
      },
      supplierId: "SUP-TEST",
      sourceType: "CSV",
    });
    expect(normalized.supplierSku).toBe("SUP-TEST-001");
    expect(normalized.title).toBe("Test Brake Pad");
  });

  it("ingestSupplierProduct runs pipeline", () => {
    clearProductEvents();
    const result = ingestSupplierProduct({
      raw: {
        supplier_sku: "SUP-INGEST-001",
        title: "Ingest Test Product",
        brand: "TestBrand",
        ean: "4006633008888",
        purchase_price: 20,
        currency: "EUR",
        stock: 5,
      },
      supplierId: "SUP-INGEST",
      sourceType: "MANUAL",
    });
    expect(result.stages.some((s) => s.stage === "normalization")).toBe(true);
    expect(result.product).toBeDefined();
  });
});

describe("Product Engine — snapshot", () => {
  it("captures order-critical fields", () => {
    const product = getProduct("bremsscheibe-280")!;
    const snap = createProductSnapshot(product, { countryCode: "DE" });
    expect(snap.productId).toBe("bremsscheibe-280");
    expect(snap.sku).toBe("BUZ-AUTO-000002");
    expect(snap.purchasePrice).toBeGreaterThan(0);
    expect(snap.customerPrice).toBeGreaterThan(0);
    expect(snap.taxContext).toBeDefined();
    expect(snap.capturedAt).toBeTruthy();
  });
});

describe("Product Engine — security", () => {
  it("strips untrusted client pricing/stock patches", () => {
    const product = getProduct("motoroel-5w30")!;
    const sanitized = sanitizeClientProductUpdate(product, {
      pricing: { ...product.pricing, customerPrice: 0.01 },
      stock: { ...product.stock, quantity: 9999 },
    });
    expect(sanitized.pricing?.customerPrice).toBe(product.pricing.customerPrice);
    expect(sanitized.stock?.quantity).toBe(product.stock.quantity);
  });
});

describe("Product Engine — dropshipping model", () => {
  it("uses supplier stock as source of truth", () => {
    const product = getProduct("reifen-pilot-sport")!;
    const supplierStock = aggregateSupplierStock(product);
    expect(product.stock.quantity).toBe(supplierStock);
    expect(product.supplierOffers[0].stock).toBeGreaterThan(0);
  });
});
