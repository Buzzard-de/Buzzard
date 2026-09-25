/**
 * Global product validation pipeline — integrates PIM, automotive, localization.
 * APPROVED ≠ PUBLISHED. Fail-closed on unknowns.
 */
const { GLOBAL_SAFETY_POLICY } = require("../../core/globalSafetyPolicy");
const { validateProductTranslations } = require("./translationValidation");
const { validateCountryAvailability } = require("./countryAvailability");
const { validateImageUrl, validateLocalizedAltText } = require("./imageLocalization");
const { buildLocalizedProductSeo } = require("./seoLocalization");
const { extractProductIdentity } = require("./productIdentity");

function validateGtinEanMpn(product = {}) {
  const errors = [];
  const identity = extractProductIdentity(product);
  if (identity.gtin && !/^\d{8,14}$/.test(identity.gtin)) {
    errors.push({ code: "INVALID_GTIN", field: "gtin" });
  }
  if (identity.ean && !/^\d{13}$/.test(identity.ean)) {
    errors.push({ code: "INVALID_EAN", field: "ean" });
  }
  if (!identity.mpn && !identity.gtin && !identity.ean) {
    errors.push({ code: "MISSING_PRODUCT_IDENTITY", field: "mpn", status: "REVIEW_REQUIRED" });
  }
  return { valid: errors.length === 0, errors };
}

function runGlobalProductPipeline(product = {}, context = {}) {
  const stages = [];
  const errors = [];
  const warnings = [];

  const translation = validateProductTranslations(product, context);
  stages.push({ stage: "translation", status: translation.valid ? "PASS" : "FAIL", details: translation });
  errors.push(...translation.errors);
  warnings.push(...translation.warnings);

  const availability = validateCountryAvailability(product);
  stages.push({ stage: "country_availability", status: availability.valid ? "PASS" : "FAIL", details: availability });
  errors.push(...availability.errors);

  const identity = validateGtinEanMpn(product);
  stages.push({ stage: "gtin_ean_mpn", status: identity.valid ? "PASS" : "FAIL", details: identity });
  errors.push(...identity.errors);

  const image = validateImageUrl(product.primaryImage || product.images?.[0]);
  stages.push({ stage: "image_validation", status: image.valid ? "PASS" : "FAIL", details: image });
  errors.push(...image.errors);

  const alt = validateLocalizedAltText(product, context.language || "de");
  if (!alt.valid) warnings.push({ code: alt.code, field: "imageAlt" });

  const seo = buildLocalizedProductSeo(product, context);
  stages.push({ stage: "seo_localization", status: seo.title ? "PASS" : "WARNING", details: seo });

  let automotiveCatalog = null;
  const isAutomotive =
    product.categoryId === "automotive" ||
    product.buzzardCategory === "automotive" ||
    product.supplierCategory?.startsWith?.("automotive");
  if (isAutomotive) {
    try {
      const bridge = require("../catalog/automotivePimBridge");
      automotiveCatalog = bridge.validatePimProduct(product, context);
      stages.push({
        stage: "automotive_validation",
        status: automotiveCatalog.valid ? "PASS" : "FAIL",
        details: automotiveCatalog,
      });
      if (!automotiveCatalog.valid) {
        for (const err of automotiveCatalog.errors || []) errors.push({ code: `AUTOMOTIVE_${err}` });
      }
    } catch {
      stages.push({ stage: "automotive_validation", status: "SKIPPED" });
    }
  }

  let pimValidation = null;
  try {
    const { runValidationPipeline } = require("../pim/productValidationPipeline");
    pimValidation = runValidationPipeline(product, {
      supplierCode: product.supplier || product.supplierCode,
      ...context,
    });
    stages.push({
      stage: "pim_validation",
      status: pimValidation.ok ? "PASS" : "FAIL",
      details: pimValidation,
    });
    if (!pimValidation.ok) errors.push(...(pimValidation.blockingReasons || []).map((code) => ({ code })));
  } catch {
    stages.push({ stage: "pim_validation", status: "SKIPPED" });
  }

  const blocked = errors.some((e) => e.status === "BLOCKED") || errors.length > 0;
  const status = blocked ? "REVIEW_REQUIRED" : warnings.length ? "REVIEW_REQUIRED" : "APPROVED";

  return {
    ok: !blocked && status !== "BLOCKED",
    status,
    blocked,
    publishAllowed: false,
    autoActivate: false,
    errors,
    warnings,
    stages,
    automotiveCatalog,
    pimValidation,
    seo,
    safety: GLOBAL_SAFETY_POLICY,
    identity: extractProductIdentity(product),
  };
}

module.exports = {
  validateGtinEanMpn,
  runGlobalProductPipeline,
};
