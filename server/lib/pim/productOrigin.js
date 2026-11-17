/**
 * Demo / dry-run / supplier-candidate classification.
 * Does not rewrite the existing demoProductGuard rules.
 */
const { isDemoOrTestProduct } = require("./demoProductGuard");

function classifyProductOrigin(product = {}) {
  const sku = String(product.sku || product.supplier_sku || "").toUpperCase();
  const id = String(product.id || product.productId || "").toUpperCase();
  const demo = isDemoOrTestProduct(product);
  const dry =
    sku.startsWith("DRY-") ||
    sku.startsWith("SYN-") ||
    sku.startsWith("API-CORE-") ||
    sku.startsWith("XML-CORE-") ||
    sku.startsWith("CSV-CORE-") ||
    id.startsWith("DRY-");
  const mock = sku.startsWith("MOCK-") || id.startsWith("MOCK");

  let origin = "UNKNOWN";
  if (demo) origin = "DEMO";
  else if (dry) origin = "DRY_RUN";
  else if (mock) origin = "MOCK";
  else if (sku) origin = "SUPPLIER_CANDIDATE";

  const publicCatalog = origin === "SUPPLIER_CANDIDATE";
  return {
    origin,
    demo,
    dryRun: dry || origin === "MOCK",
    mock,
    sku: sku || null,
    publicCatalog,
    storefrontVisible: false,
    salesEnabled: false,
    live: false,
  };
}

module.exports = { classifyProductOrigin };
