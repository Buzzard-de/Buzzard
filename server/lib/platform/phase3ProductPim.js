/**
 * Phase 3 — Product creation & PIM data management (dry-run / no live publish).
 */
const { bindProductCategory } = require("../pim/productCategoryBind");
const { validateEan } = require("../productValidator");
const { normalizeBrand } = require("../pim/brandNormalizer");
const { canPublishProduct } = require("../pim/productCatalogPublish");
const { classifyProductOrigin } = require("../pim/productOrigin");
const { assessMedia } = require("../pim/mediaReadiness");
const { importSupplierFeed } = require("../supplier/supplierImportPipeline");
const { searchAndSort } = require("../pim/catalogSearchSort");
const { getSearchHealth } = require("../commerce/productSearchAbstraction");

const SAMPLE = {
  supplier_category: "automotive/bremssystem",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  sku: "DRY-SKU-001",
  supplier_sku: "DRY-SKU-001",
  title: "Brake pad set",
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
};

function evaluatePhase3ProductPim() {
  const bound = bindProductCategory(SAMPLE);
  const ean = validateEan(SAMPLE.ean_gtin);
  const brand = normalizeBrand(SAMPLE.brand);
  const media = assessMedia({
    url: SAMPLE.images[0],
    altText: "Brake pad",
    product: SAMPLE,
  });
  const demoMedia = assessMedia({
    url: "https://cdn.test-supplier.example.de/demo.jpg",
    product: { sku: "BZ-CORE-DEMO-001", title: "Demo" },
  });
  const origin = classifyProductOrigin(SAMPLE);
  const demoOrigin = classifyProductOrigin({ sku: "BZ-CORE-DEMO-001", title: "Demo product" });
  const publishDemo = canPublishProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo", brand: "Buzzard Demo" });
  const imported = importSupplierFeed({ supplierId: "api-supplier-dry", format: "api", records: [SAMPLE] });
  const sorted = searchAndSort(
    [
      { sku: "B", title: "Brake", price: 20, stock: 1 },
      { sku: "A", title: "Axle", price: 10, stock: 5 },
    ],
    { q: "a", sort: "price", order: "asc" }
  );
  const health = getSearchHealth();

  const checks = [
    { id: "PIM_BIND_CATEGORY", ok: bound.ok && Boolean(bound.categoryId), categoryId: bound.categoryId },
    { id: "PIM_EAN", ok: ean.ok === true },
    { id: "PIM_BRAND", ok: Boolean(brand.canonical) },
    { id: "PIM_MEDIA", ok: media.ok && demoMedia.code === "MEDIA_DEMO_BLOCKED" },
    { id: "PIM_ORIGIN", ok: origin.origin === "DRY_RUN" && demoOrigin.origin === "DEMO" },
    { id: "PIM_DEMO_PUBLISH_BLOCKED", ok: publishDemo.status === "SKIPPED_DEMO" || publishDemo.ok === false },
    { id: "PIM_DRY_IMPORT", ok: imported && imported.ok !== false, liveImport: false },
    { id: "PIM_SEARCH", ok: sorted.items[0]?.sku === "A" && health.fallbackAvailable },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return {
    phase: 3,
    title: "Ürün oluşturma ve ürün veri yönetimi",
    ok: passed === total,
    percentComplete: Math.round((passed / total) * 1000) / 10,
    passed,
    total,
    checks,
    livePublish: false,
    pimWrite: false,
    completeClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase3ProductPim };