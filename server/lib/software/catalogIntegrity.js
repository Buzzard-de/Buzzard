/**
 * Product and catalog integrity — local software only.
 * Product SoT stays inactive. Dual-write stays forbidden.
 * Live PIM publish, live import, live OpenSearch, and invented prices/images stay blocked.
 *
 * Taxonomy honesty (do not collapse to one invented L1 count):
 *   shop JSON 53 L1, customer-facing 50 L1, master/legacy smart_menu_48 = 48.
 */

const productValidator = require("../productValidator");
const { getProductArchitecture, activationStatus, assertNoDualWrite } = require("../pim/productArchitecture");
const { isProductSourceOfTruthActive, authorizeCreate } = require("../pim/productWriteBoundary");
const { isSalesEnabled } = require("../salesMode");
const { getLocalSearchIndexStatus } = require("./search");
const { measure } = require("./localeCoverage");
const taxonomyCanonical = require("../taxonomyCanonical");
const pimPublish = require("./pimPublish");
const sotActivation = require("./sotActivation");

const SHOP_L1_COUNT = 53;
const CUSTOMER_FACING_L1_COUNT = 50;
const MASTER_TAXONOMY_L1_COUNT = 48;
const INTERNAL_ONLY_L1_IDS = Object.freeze(["cat-30", "cat-37", "cat-39"]);

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeSku(value) {
  return String(value || "").trim().toUpperCase();
}

function inspect() {
  const architecture = getProductArchitecture();
  const sot = activationStatus();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    productSourceOfTruthActive: false,
    writeBoundaryActive: isProductSourceOfTruthActive() === true,
    dualWrite: false,
    stores: architecture.stores,
    candidateSelected: architecture.candidate.selected === true,
    candidateActivated: architecture.candidate.activated === true,
    catalogRoutingUnified: architecture.catalogRouting.unified === true,
    listingMerge: architecture.catalogRouting.listingMerge,
    envSotFlag: sot.envFlag === true,
    envDoesNotActivate: true,
  };
}

function matchProducts(left = {}, right = {}, options = {}) {
  const skuA = normalizeSku(left.sku);
  const skuB = normalizeSku(right.sku);
  const eanA = digits(left.ean || left.gtin);
  const eanB = digits(right.ean || right.gtin);

  if (options.fuzzy === true || options.mergeByTitle === true || options.inventedMerge === true) {
    return {
      matched: false,
      merged: false,
      invented: false,
      persist: false,
      reason: "INVENTED_MERGE_BLOCKED",
    };
  }

  if (skuA && skuB && skuA === skuB) {
    return { matched: true, merged: false, invented: false, key: "sku", sku: skuA };
  }
  if (eanA && eanB && eanA === eanB) {
    return { matched: true, merged: false, invented: false, key: "ean", ean: eanA };
  }
  return {
    matched: false,
    merged: false,
    invented: false,
    reason: "NO_EXACT_IDENTITY",
  };
}

function skuUniqueness(rows = []) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const sku = normalizeSku(row.sku);
    if (!sku) continue;
    if (seen.has(sku)) duplicates.push(sku);
    else seen.set(sku, row);
  }
  return {
    ok: duplicates.length === 0,
    storeScope: "per_store",
    globalSot: false,
    uniqueCount: seen.size,
    duplicates,
    reason: duplicates.length ? "SKU_DUPLICATE_IN_STORE" : "STORE_UNIQUE",
  };
}

function variantsLocal(input = {}) {
  const parentSku = normalizeSku(input.parentSku);
  const childSku = normalizeSku(input.sku || input.childSku);
  if (!parentSku || !childSku) {
    return { ok: false, secondMaster: false, persist: false, reason: "PARENT_AND_CHILD_SKU_REQUIRED" };
  }
  if (parentSku === childSku) {
    return { ok: false, secondMaster: false, persist: false, reason: "CHILD_SKU_EQUALS_PARENT" };
  }
  return {
    ok: true,
    persist: false,
    secondMaster: false,
    parentSku,
    childSku,
    relatedWrite: true,
    note: "Child SKU stays under the parent. Not a second master row. SoT inactive.",
  };
}

function inventLivePrice() {
  return {
    ok: false,
    invented: false,
    live: false,
    liveVerified: false,
    persist: false,
    reason: "INVENTED_LIVE_PRICE_BLOCKED",
  };
}

function inventLiveImage() {
  return {
    ok: false,
    invented: false,
    live: false,
    liveVerified: false,
    persist: false,
    reason: "INVENTED_LIVE_IMAGE_BLOCKED",
  };
}

function confirmLiveOpenSearch() {
  const status = getLocalSearchIndexStatus();
  return {
    ok: false,
    proven: false,
    live: false,
    liveOpenSearch: false,
    servingBackend: status.servingBackend,
    opensearchStubActive: status.opensearchStubActive,
    reason: "LIVE_OPENSEARCH_NOT_PROVEN",
    note: status.note,
  };
}

function confirmLiveCatalog() {
  return {
    ok: false,
    proven: false,
    live: false,
    liveVerified: false,
    reason: "LIVE_CATALOG_NOT_PROVEN",
  };
}

function importLive(input = {}) {
  return {
    ok: false,
    persist: false,
    mutated: false,
    live: false,
    imported: false,
    forceLiveIgnored: input.forceLive === true,
    reason: "LIVE_IMPORT_BLOCKED",
  };
}

function importDryRun(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const invalid = list.filter((row) => !normalizeSku(row.sku));
  return {
    ok: invalid.length === 0,
    persist: false,
    mutated: false,
    live: false,
    dryRun: true,
    rowCount: list.length,
    invalidSkuCount: invalid.length,
    reason: invalid.length ? "SKU_REQUIRED" : "DRY_RUN",
  };
}

function taxonomyHonesty() {
  const canonical = taxonomyCanonical.validateCanonicalTaxonomy();
  const meta = taxonomyCanonical.getTaxonomyMeta();
  return {
    ok: canonical.ok && canonical.count === SHOP_L1_COUNT,
    invented: false,
    shopL1: SHOP_L1_COUNT,
    customerFacingL1: CUSTOMER_FACING_L1_COUNT,
    masterLegacyL1: MASTER_TAXONOMY_L1_COUNT,
    loadedCount: canonical.count,
    canonicalSource: meta.canonical.source,
    legacy48Status: meta.legacy48.status,
    internalOnlyL1: INTERNAL_ONLY_L1_IDS.slice(),
    collapsedToOneCount: false,
    note: "Shop JSON is 53 L1; customer-facing menu is 50; smart_menu_48 remains compatibility 48.",
  };
}

function categoryLocalization() {
  const coverage = measure();
  return {
    ok: coverage.inventedTranslations === false,
    inventedTranslations: false,
    localesDocumented: ["de", "en", "tr", "ar"],
    languageIndependentFromMarket: coverage.languageIndependentFromMarket === true,
    liveVerified: false,
    everySkuProven: false,
  };
}

function validateProduct(input = {}) {
  const result = productValidator.validateProduct
    ? productValidator.validateProduct(input)
    : productValidator.validate(input);
  return {
    ...result,
    live: false,
    liveVerified: false,
    legalClaim: false,
  };
}

function customsDecision(input = {}) {
  const decision = productValidator.validateCustomsDecision(input);
  return {
    ...decision,
    live: false,
    legalClaim: false,
  };
}

function catalogHealth() {
  return {
    ok: true,
    live: false,
    liveVerified: false,
    pimPublishLive: false,
    sotActive: false,
    search: getLocalSearchIndexStatus(),
    taxonomy: taxonomyHonesty(),
  };
}

function seoCreatePolicy(input = {}) {
  const gate = authorizeCreate(
    { sku: input.sku || "SEO-DRAFT", status: input.status || "ACTIVE", active: input.active },
    {
      source: "ADMIN",
      actorId: input.actorId || "admin-test",
      authorized: true,
      requireExplicitAuth: true,
      destination: "products",
    }
  );
  return {
    persist: false,
    dualWrite: false,
    productSourceOfTruthActive: false,
    activeCreateRejected: gate.reason === "ACTIVE_CREATE_REJECTED",
    reason: gate.reason,
    note: "catalogSeo createProduct stays behind the write boundary; ACTIVE create is rejected while sales/SoT are off.",
  };
}

function jsonStorePath() {
  const configured = process.env.BUZZARD_PRODUCT_STORE_PATH || null;
  return {
    ok: true,
    live: false,
    productSourceOfTruthActive: false,
    configuredPath: Boolean(configured),
    pathIsCanonicalSot: false,
    note: "JSON product store is one of several stores. Path env does not activate SoT.",
  };
}

function refuseDualWrite() {
  assertNoDualWrite({ dualWrite: false });
  try {
    assertNoDualWrite({ dualWrite: true });
    return { ok: false, dualWrite: true, reason: "DUAL_WRITE_NOT_THROWN" };
  } catch (err) {
    return {
      ok: true,
      dualWrite: false,
      thrown: true,
      message: String(err && err.message),
    };
  }
}

function livePublish(input = {}) {
  return pimPublish.livePublish(input);
}

function activateSot(input = {}) {
  return sotActivation.activate(input);
}

module.exports = {
  SHOP_L1_COUNT,
  CUSTOMER_FACING_L1_COUNT,
  MASTER_TAXONOMY_L1_COUNT,
  INTERNAL_ONLY_L1_IDS,
  inspect,
  matchProducts,
  skuUniqueness,
  variantsLocal,
  inventLivePrice,
  inventLiveImage,
  confirmLiveOpenSearch,
  confirmLiveCatalog,
  importLive,
  importDryRun,
  taxonomyHonesty,
  categoryLocalization,
  validateProduct,
  customsDecision,
  catalogHealth,
  seoCreatePolicy,
  jsonStorePath,
  refuseDualWrite,
  livePublish,
  activateSot,
};
