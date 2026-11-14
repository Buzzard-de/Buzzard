/**
 * Part 5 — Product sync pipeline (foundation, no live supplier).
 */
const { getAdapter } = require("../supplier/adapterRegistry");
const { validateSku, detectDuplicateSku } = require("./pipeline");
const { db } = require("../db");

async function runPipeline({ supplierId = "mock", dryRun = true } = {}) {
  const adapter = getAdapter(supplierId);
  const auth = await adapter.authenticate();
  const fetched = await adapter.fetchProducts();
  const rawProducts = Array.isArray(fetched) ? fetched : fetched.records || [];
  const blocked = !fetched || fetched.ok !== true || fetched.live !== true;
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
    ok: false,
    live: false,
    mock: fetched.mock === true || auth.mock === true,
    status: fetched.status || auth.status || "BLOCKED_EXTERNAL",
    code: fetched.code || auth.code,
    commercialEligibility: "BLOCKED",
    supplierId,
    dryRun,
    imported: 0,
    validated: blocked ? normalized.length : 0,
    duplicates: duplicates.length,
    errors: errors.length,
    products: normalized,
    purchased: false,
    note: "Supplier rows are not a live catalog import",
  };
}

module.exports = { runPipeline };
