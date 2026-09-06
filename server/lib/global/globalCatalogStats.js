/**
 * Collect PIM product stats for global catalog health admin dashboard.
 */
const productCore = require("../pim/productCore");
const { buildProductValidationReport } = require("./productValidationReport");
const { validateProductIdentity } = require("../pim/productIdentityValidator");

function collectProductStats() {
  const products = productCore.listProducts({ limit: 2000 });
  const stats = {
    productCount: products.length,
    draft: 0,
    review: 0,
    approved: 0,
    published: 0,
    blocked: 0,
    missingImages: 0,
    missingGtin: 0,
    invalidGtin: 0,
    missingMpn: 0,
    invalidCategories: 0,
    missingTranslations: 0,
    fitmentErrors: 0,
    seoErrors: 0,
    byCountry: {},
  };

  for (const product of products) {
    const status = String(product.status || "draft").toLowerCase();
    if (status === "draft") stats.draft++;
    else if (status === "review" || status === "validation_pending") stats.review++;
    else if (status === "approved" || status === "validated") stats.approved++;
    else if (status === "published" || status === "active") stats.published++;
    else if (status === "blocked" || status === "invalid") stats.blocked++;

    if (!product.images?.length) stats.missingImages++;
    const identity = validateProductIdentity(product, { requireGtin: false, requireMpn: false });
    if (!identity.normalized?.gtin && !product.ean) stats.missingGtin++;
    if (identity.findings?.some((f) => f.code?.includes("GTIN_INVALID"))) stats.invalidGtin++;
    if (!identity.normalized?.mpn) stats.missingMpn++;
    if (!product.category && !product.pimCategoryId) stats.invalidCategories++;

    const report = buildProductValidationReport(product, { language: "de" });
    if (report.languageSeo.status !== "PASS") stats.missingTranslations++;
    if (report.vehicleCompatibility.status !== "PASS") stats.fitmentErrors++;
    if (report.languageSeo.details?.seo && !report.languageSeo.details.seo.title) stats.seoErrors++;
  }

  return stats;
}

module.exports = {
  collectProductStats,
};
