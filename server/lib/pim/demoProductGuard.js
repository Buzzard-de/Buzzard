/**
 * Part 15 — Central demo/test product detection.
 * Used by storefront visibility and catalog migration/publish pipelines.
 * Do not weaken these rules — demo products must never reach the public catalog.
 */

const KNOWN_DEMO_SKUS = new Set(["BZ-CORE-DEMO-001"]);
const KNOWN_DEMO_IDS = new Set(["pim_prod_demo001"]);

function isDemoOrTestProduct(product) {
  if (!product) return false;

  const sku = String(product.sku || "").toUpperCase();
  const id = String(product.id || product.sourceId || "").toLowerCase();
  const title = String(product.title || product.name || "").toLowerCase();
  const brand = String(product.brand?.name || product.brand || "").toLowerCase();

  if (KNOWN_DEMO_SKUS.has(sku) || KNOWN_DEMO_IDS.has(id)) return true;
  if (sku.includes("DEMO") || id.includes("demo")) return true;
  if (/\bdemo\b/.test(title) || /\btestprodukt\b/.test(title)) return true;
  if (/\btest[-_\s]?product\b/.test(title)) return true;
  if (brand.includes("demo") || brand === "buzzard demo") return true;

  return false;
}

function isVariantSkuOfDemoParent(sku, demoParentSkus) {
  const upper = String(sku || "").toUpperCase();
  for (const parent of demoParentSkus) {
    if (upper.startsWith(`${parent}-`) || upper.startsWith(`${parent}_`)) return true;
  }
  return false;
}

module.exports = {
  isDemoOrTestProduct,
  /** @deprecated alias — storefront compatibility */
  isDemoStorefrontProduct: isDemoOrTestProduct,
  isVariantSkuOfDemoParent,
  KNOWN_DEMO_SKUS,
  KNOWN_DEMO_IDS,
};
