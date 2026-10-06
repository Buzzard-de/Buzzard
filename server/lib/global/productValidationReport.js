/**
 * Structured per-product validation report — all stages with standardized status codes.
 */
const { normalizeCanonicalProduct } = require("./productCanonicalModel");
const { validateProductIdentity } = require("../pim/productIdentityValidator");
const { validateProductTranslations } = require("./translationValidation");
const { validateCountryAvailability } = require("./countryAvailability");
const { validateImageUrl, validateLocalizedAltText } = require("./imageLocalization");
const { buildLocalizedProductSeo } = require("./seoLocalization");
const { GLOBAL_SAFETY_POLICY } = require("../../core/globalSafetyPolicy");

const STAGE_STATUS = Object.freeze(["PASS", "FAIL", "REVIEW_REQUIRED", "BLOCKED"]);

function stageResult(name, status, details = {}) {
  const normalized = STAGE_STATUS.includes(status) ? status : "REVIEW_REQUIRED";
  return { stage: name, status: normalized, details };
}

function buildProductValidationReport(product = {}, context = {}) {
  const canonical = normalizeCanonicalProduct(product);
  const identityResult = validateProductIdentity(product, {
    requireGtin: false,
    requireMpn: false,
  });

  let identityStatus = "PASS";
  if (identityResult.status === "BLOCKED") identityStatus = "BLOCKED";
  else if (identityResult.status === "CONDITION") identityStatus = "REVIEW_REQUIRED";
  else if (!identityResult.ok) identityStatus = "FAIL";

  const translation = validateProductTranslations(product, context);
  const availability = validateCountryAvailability(product);
  const image = validateImageUrl(product.primaryImage || product.images?.[0]?.url || product.images?.[0]?.src);
  const alt = validateLocalizedAltText(product, context.language || "de");
  const seo = buildLocalizedProductSeo(product, context);

  let supplierMapping = { status: "PASS", mapped: true };
  if (canonical.taxonomy.supplierCategory) {
    try {
      const categoryMapping = require("../catalog/categoryMapping");
      const resolved = categoryMapping.resolveSupplierCategory(
        product.supplier || product.supplierCode,
        canonical.taxonomy.supplierCategory,
        product.supplierSubcategory,
        product.supplierProductType
      );
      supplierMapping = {
        status: resolved.mapped ? "PASS" : "REVIEW_REQUIRED",
        mapped: resolved.mapped,
        sourceCategory: canonical.taxonomy.supplierCategory,
        resolvedCategory: resolved.buzzardCategoryId || null,
        confidence: resolved.mapped ? 1 : 0,
        mappingRule: resolved.mapped ? "deterministic" : null,
        timestamp: new Date().toISOString(),
      };
    } catch {
      supplierMapping = { status: "REVIEW_REQUIRED", mapped: false };
    }
  }

  let vehicleCompatibility = { status: "PASS", fitments: canonical.automotive.vehicleCompatibility.length };
  if (canonical.automotive.vehicleCompatibility.length === 0 && product.category === "automotive") {
    vehicleCompatibility = { status: "REVIEW_REQUIRED", fitments: 0, code: "FITMENT_MISSING" };
  }

  const workflowStatus = product.status || "DRAFT";
  const approved = workflowStatus === "approved" || workflowStatus === "APPROVED";
  const published = workflowStatus === "published" || workflowStatus === "active";
  const manualPublish = Boolean(product.manualPublish);

  let publishStatus = "BLOCKED";
  if (published && manualPublish && GLOBAL_SAFETY_POLICY.publishBlocked) publishStatus = "BLOCKED";
  else if (published) publishStatus = "PASS";
  else if (approved) publishStatus = "REVIEW_REQUIRED";

  return {
    sku: canonical.identity.sku,
    identity: stageResult("identity", identityStatus, identityResult),
    taxonomy: stageResult("taxonomy", canonical.taxonomy.mainCategory ? "PASS" : "REVIEW_REQUIRED", canonical.taxonomy),
    supplierMapping: stageResult("supplier_mapping", supplierMapping.status, supplierMapping),
    validation: stageResult("validation", identityStatus === "PASS" ? "PASS" : identityStatus, { findings: identityResult.findings }),
    gtin: stageResult("gtin", identityResult.normalized?.gtin ? "PASS" : "REVIEW_REQUIRED", { value: identityResult.normalized?.gtin }),
    mpn: stageResult("mpn", identityResult.normalized?.mpn ? "PASS" : "REVIEW_REQUIRED", { value: identityResult.normalized?.mpn }),
    vehicleCompatibility: stageResult("vehicle_compatibility", vehicleCompatibility.status, vehicleCompatibility),
    images: stageResult("images", image.valid ? "PASS" : "REVIEW_REQUIRED", image),
    languageSeo: stageResult("language_seo", translation.valid && seo.title ? "PASS" : "REVIEW_REQUIRED", { translation, seo, alt }),
    countryAvailability: stageResult("country_availability", availability.valid ? "PASS" : "REVIEW_REQUIRED", availability),
    review: stageResult("review", workflowStatus === "review" ? "REVIEW_REQUIRED" : "PASS", { workflowStatus }),
    approval: stageResult("approval", approved ? "PASS" : "REVIEW_REQUIRED", { approved, note: "APPROVED != PUBLISHED" }),
    publish: stageResult("publish", publishStatus, {
      manualPublish,
      published,
      publishAllowed: false,
      note: "APPROVED != PUBLISHED",
      safety: GLOBAL_SAFETY_POLICY,
    }),
    canonical,
    safety: GLOBAL_SAFETY_POLICY,
  };
}

module.exports = {
  STAGE_STATUS,
  buildProductValidationReport,
};
