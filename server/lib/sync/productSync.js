/**
 * Part 5 — Product sync pipeline (foundation, no live supplier).
 */
const { getAdapter } = require("../supplier/adapterRegistry");
const { validateSku, detectDuplicateSku } = require("./pipeline");
const { db } = require("../db");

async function runPipeline({ supplierId = "mock", dryRun = true } = {}) {
  const adapter = getAdapter(supplierId);
  await adapter.authenticate();
  const rawProducts = await adapter.fetchProducts();
  const existing = new Set(
    db.prepare("SELECT sku FROM products").all().map((r) => r.sku)
  );

  const normalized = [];
  const errors = [];
  const duplicates = [];

  for (const raw of rawProducts) {
    const product = adapter.normalizeProduct(raw);
    const skuCheck = validateSku(product.sku);
    if (!skuCheck.ok) {
      errors.push({ sku: product.sku, error: skuCheck.error });
      continue;
    }
    if (detectDuplicateSku(existing, product.sku)) {
      duplicates.push(product.sku);
    }
    normalized.push({
      sku: product.sku,
      ean: product.ean,
      gtin: product.gtin,
      name: product.name,
      brand: product.brand,
      categoryId: product.categoryId,
      images: product.images,
      price: product.price,
      stock: product.stock,
    });
  }

  return {
    supplierId,
    dryRun,
    imported: dryRun ? 0 : normalized.length,
    validated: normalized.length,
    duplicates: duplicates.length,
    errors: errors.length,
    products: normalized,
    note: dryRun ? "Dry run — catalog not modified" : "Foundation only",
  };
}

module.exports = { runPipeline };
