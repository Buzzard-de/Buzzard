/**
 * Automotive product readiness pipeline.
 *
 * Flow:
 *   Automotive Taxonomy → PIM → Supplier Category Mapping → Product Validation
 *   → GTIN/EAN/MPN → Vehicle Compatibility → Image Control → Language/SEO
 *   → Admin Review → APPROVED → MANUAL PUBLISH
 *
 * No automatic publish. No sales activation.
 */
const { AUTOMOTIVE_SAFETY_POLICY, PRODUCT_STATES } = require("../../core/automotive/automotiveTaxonomy");
const taxonomyResolver = require("./taxonomyResolver");
const categoryMapping = require("./categoryMapping");
const productCategoryValidator = require("./productCategoryValidator");
const { validateProductIdentity } = require("../pim/productIdentityValidator");
const { validateCompatibilitySchema } = require("../../core/automotive/automotiveVehicleCompatibility");
const { validateImageSet } = require("../pim/imagePipeline");

const PIPELINE_STAGES = Object.freeze([
  "automotive_taxonomy",
  "pim",
  "supplier_category_mapping",
  "product_validation",
  "gtin_ean_mpn",
  "vehicle_compatibility",
  "image_control",
  "language_seo",
  "admin_review",
  "approved",
  "manual_publish",
]);

const WORKFLOW_STATES = Object.freeze({
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
});

function stageResult(stage, status, errors = [], details = {}) {
  return { stage, status, errors, details };
}

function isAutomotiveProduct(product) {
  return Boolean(
    product?.categoryId === "automotive" ||
      product?.automotiveCategoryId ||
      product?.subcategoryId?.startsWith?.("auto-sub-") ||
      product?.supplierCategory?.startsWith?.("automotive")
  );
}

function validateLanguageSeo(product) {
  const errors = [];
  const title = String(product.title || product.name || "").trim();
  if (title.length < 3) errors.push("title too short for SEO");

  const seo = product.seo || {};
  if (seo.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seo.slug)) {
    errors.push("invalid seo slug");
  }
  if (seo.metaTitle && String(seo.metaTitle).length > 120) {
    errors.push("metaTitle exceeds 120 chars");
  }
  if (seo.metaDescription && String(seo.metaDescription).length > 320) {
    errors.push("metaDescription exceeds 320 chars");
  }

  const i18n = product.i18n || product.translations || {};
  const locales = ["de", "en"];
  for (const locale of locales) {
    const entry = i18n[locale];
    if (entry && !String(entry.title || entry.name || "").trim()) {
      errors.push(`missing ${locale} title`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details: { title, hasSeo: Boolean(seo.slug || seo.metaTitle) },
  };
}

function runAutomotiveProductPipeline(product, options = {}) {
  const stages = [];
  const allErrors = [];
  let blocked = false;

  const WORKFLOW_ONLY_STAGES = new Set(["admin_review", "approved", "manual_publish"]);

  function record(result) {
    stages.push(result);
    if (result.status === "FAIL") {
      blocked = true;
      allErrors.push(...result.errors.map((e) => `${result.stage}: ${e}`));
    } else if (result.status === "BLOCKED" && !WORKFLOW_ONLY_STAGES.has(result.stage)) {
      blocked = true;
      allErrors.push(...result.errors.map((e) => `${result.stage}: ${e}`));
    }
  }

  // 1. Automotive Taxonomy
  const taxonomyRefs = taxonomyResolver.resolveProductCategories({
    categoryId: product.categoryId || "automotive",
    subcategoryId: product.subcategoryId,
    subSubcategoryId: product.subSubcategoryId,
  });
  const taxonomyCheck = productCategoryValidator.validateProductCategoryRefs({
    ...product,
    categoryId: taxonomyRefs.categoryId || product.categoryId,
    subcategoryId: product.subcategoryId,
    subSubcategoryId: product.subSubcategoryId,
    state: product.state || WORKFLOW_STATES.DRAFT,
  });
  record(
    stageResult(
      "automotive_taxonomy",
      taxonomyCheck.valid ? "PASS" : "FAIL",
      taxonomyCheck.errors,
      { refs: taxonomyRefs }
    )
  );

  // 2. PIM structure
  const pimErrors = [];
  if (!product.sku) pimErrors.push("sku required");
  if (!product.title && !product.name) pimErrors.push("title required");
  record(stageResult("pim", pimErrors.length ? "FAIL" : "PASS", pimErrors));

  // 3. Supplier Category Mapping
  let mapping = null;
  if (product.supplierCategory) {
    mapping = categoryMapping.resolveSupplierCategory(
      product.supplier || "mock",
      product.supplierCategory,
      product.supplierSubcategory,
      product.supplierProductType
    );
    record(
      stageResult(
        "supplier_category_mapping",
        mapping.mapped ? "PASS" : "FAIL",
        mapping.mapped ? [] : ["supplier category not mapped"],
        mapping
      )
    );
  } else {
    record(
      stageResult("supplier_category_mapping", "SKIP", [], { reason: "no supplier category on record" })
    );
  }

  // 4. Product Validation (PIM core — no DB duplicate check; identity handled in stage 5)
  const validationErrors = [];
  if (!product.title && !product.name) validationErrors.push("title required");
  if (!product.brand && !product.brandId) validationErrors.push("brand required");
  if (!product.subcategoryId && !product.categoryId) validationErrors.push("category required");
  if (product.description && String(product.description).length < 10) {
    validationErrors.push("description too short");
  }
  record(
    stageResult(
      "product_validation",
      validationErrors.length ? "FAIL" : "PASS",
      validationErrors,
      { validatedFields: ["title", "brand", "category", "description"] }
    )
  );

  // 5. GTIN / EAN / MPN
  const identity = validateProductIdentity(product, {
    requireGtin: options.requireGtin !== false,
    requireMpn: options.requireMpn !== false,
  });
  record(
    stageResult(
      "gtin_ean_mpn",
      identity.ok ? "PASS" : "FAIL",
      identity.findings.filter((f) => f.severity === "BLOCKED").map((f) => f.message || f.code),
      { normalized: identity.normalized, status: identity.status }
    )
  );

  // 6. Vehicle Compatibility
  const compatRequired = Boolean(product.compatibilityRequired || product.subcategoryId?.startsWith?.("auto-sub-"));
  const vehicles = product.compatibleVehicles || product.vehicleFitment || [];
  let compatErrors = [];
  if (compatRequired && (!Array.isArray(vehicles) || vehicles.length === 0)) {
    compatErrors.push("vehicle compatibility required for automotive category");
  }
  for (const v of vehicles) {
    const check = validateCompatibilitySchema(v);
    if (!check.valid) compatErrors.push(...check.errors);
  }
  record(
    stageResult(
      "vehicle_compatibility",
      compatErrors.length ? (compatRequired ? "FAIL" : "WARNING") : vehicles.length ? "PASS" : "SKIP",
      compatErrors,
      { count: vehicles.length, required: compatRequired }
    )
  );

  // 7. Image Control
  const imageCheck = validateImageSet(product.images || (product.primaryImage ? [product.primaryImage] : []), {
    requirePrimary: options.requireImage !== false,
  });
  record(
    stageResult(
      "image_control",
      imageCheck.ok ? "PASS" : "FAIL",
      imageCheck.ok ? [] : [imageCheck.code || "image invalid"],
      { validCount: imageCheck.valid?.length || 0 }
    )
  );

  // 8. Language / SEO
  const langSeo = validateLanguageSeo(product);
  record(
    stageResult("language_seo", langSeo.valid ? "PASS" : "FAIL", langSeo.errors, langSeo.details)
  );

  // 9. Admin Review
  const state = product.state || WORKFLOW_STATES.DRAFT;
  const reviewOk = [WORKFLOW_STATES.REVIEW, WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.PUBLISHED].includes(state);
  record(
    stageResult(
      "admin_review",
      reviewOk ? "PASS" : "PENDING",
      reviewOk ? [] : ["awaiting admin review"],
      { state, humanApprovalRequired: true }
    )
  );

  // 10. APPROVED gate
  const approvedOk = state === WORKFLOW_STATES.APPROVED || state === WORKFLOW_STATES.PUBLISHED;
  record(
    stageResult(
      "approved",
      approvedOk ? "PASS" : "BLOCKED",
      approvedOk ? [] : ["product not in APPROVED state"],
      { state }
    )
  );

  // 11. MANUAL PUBLISH — never automatic
  const manualPublishRequested = options.manualPublish === true;
  let publishStatus = "BLOCKED";
  let publishErrors = ["manual publish required — automatic publish forbidden"];

  if (manualPublishRequested) {
    if (state === WORKFLOW_STATES.PUBLISHED) {
      publishStatus = "PASS";
      publishErrors = [];
    } else if (state === WORKFLOW_STATES.APPROVED && !blocked) {
      publishStatus = "READY";
      publishErrors = ["approved — awaiting explicit publish action by admin"];
    } else {
      publishStatus = "BLOCKED";
      publishErrors = ["cannot publish until all prior stages pass and state is APPROVED"];
    }
  }

  if (!manualPublishRequested && state === WORKFLOW_STATES.PUBLISHED) {
    publishStatus = "FAIL";
    publishErrors = ["automatic publish is forbidden"];
    blocked = true;
  }

  record(stageResult("manual_publish", publishStatus, publishErrors, { manualPublishRequested }));

  const automatedStagesPass = stages
    .filter((s) =>
      [
        "automotive_taxonomy",
        "pim",
        "supplier_category_mapping",
        "product_validation",
        "gtin_ean_mpn",
        "vehicle_compatibility",
        "image_control",
        "language_seo",
      ].includes(s.stage)
    )
    .every((s) => s.status === "PASS" || s.status === "SKIP" || s.status === "WARNING");

  const recommendedState = blocked
    ? WORKFLOW_STATES.DRAFT
    : automatedStagesPass
      ? WORKFLOW_STATES.REVIEW
      : WORKFLOW_STATES.DRAFT;

  return {
    ok: !blocked && automatedStagesPass,
    blocked,
    pipeline: PIPELINE_STAGES,
    stages,
    errors: allErrors,
    workflow: {
      current: state,
      recommended: recommendedState,
      allowedStates: PRODUCT_STATES,
      publishAllowed: false,
      manualPublishOnly: true,
    },
    taxonomy: taxonomyRefs,
    supplierMapping: mapping,
    identity: identity.normalized,
    safety: AUTOMOTIVE_SAFETY_POLICY,
    status: blocked ? "BLOCKED" : automatedStagesPass ? "READY_FOR_ADMIN_REVIEW" : "VALIDATION_PENDING",
  };
}

module.exports = {
  PIPELINE_STAGES,
  WORKFLOW_STATES,
  isAutomotiveProduct,
  validateLanguageSeo,
  runAutomotiveProductPipeline,
};
