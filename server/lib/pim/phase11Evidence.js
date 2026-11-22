/**
 * Phase 11 product source-of-truth evidence.
 * Uses productCore, productSot, provenance, and the existing validators.
 * Does not activate the production SoT and does not publish a product.
 */
const os = require("os");
const path = require("path");
const { resolveDbPath } = require("../dbPaths");
const productCore = require("./productCore");
const productSot = require("../productSot");
const productAudit = require("./productAudit");
const { classifyProductOrigin } = require("./productOrigin");
const { canPublishProduct, publishDryRun } = require("./productCatalogPublish");
const { envelopeProductContent, LOCALES } = require("./productContentI18n");
const { buildProvenance, validateProvenance } = require("./productProvenance");
const { normalizeSupplierProductRecord } = require("./supplierProductNormalizer");
const { detectDuplicates } = require("./productDuplicateDetector");
const { bindProductCategory } = require("./productCategoryBind");
const { validateGtin } = require("../supplier/supplierIdentity");
const { PRODUCT_STATUS } = require("../../core/productConstants");

const SKU = "PHASE11-SYN-001";
const EAN = "5901234999993";

function writesAllowed() {
  const resolved = path.resolve(resolveDbPath());
  if (resolved.includes(`${path.sep}workspace${path.sep}`)) return false;
  if (path.basename(resolved) === "buzzard.db" && resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return false;
  return process.env.VITEST === "true" || resolved.startsWith(`${os.tmpdir()}${path.sep}`) || resolved.startsWith("/tmp/");
}

function withEnv(keys, fn) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (previous[key] == null) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function ensureProduct() {
  const existing = productCore.getProduct(SKU);
  if (existing) return existing;
  return productCore.createProduct({
    sku: SKU,
    supplierSku: SKU,
    ean: EAN,
    gtin: EAN,
    mpn: "P11-SYN",
    title: "Phase 11 synthetic brake pad",
    brand: "ATE",
    category: "cat-05-03",
    supplierId: "api-supplier-dry",
    status: PRODUCT_STATUS.DRAFT,
    visibility: "HIDDEN",
    attributes: { position: "front" },
    price: 0,
    stock: 0,
  }, { source: "PHASE11", actorId: "phase11" });
}

function identityEvidence() {
  return withEnv(["BUZZARD_PRODUCT_SOT_ACTIVE", "BUZZARD_PRODUCT_SOT_EXCLUSIVE"], () => {
    delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    delete process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE;
    const idle = productSot.getStatus();
    process.env.BUZZARD_PRODUCT_SOT_ACTIVE = "1";
    const flagOnly = productSot.isSotActive();
    process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE = "1";
    const both = productSot.isSotActive();
    let legacyLocked = false;
    try {
      productSot.assertCanonicalWrite("A");
    } catch (err) {
      legacyLocked = err.code === "product_sot_legacy_locked";
    }
    const canonical = productSot.assertCanonicalWrite("D");
    return {
      ok: idle.target === "D"
        && idle.targetTable === "pim_core_products"
        && idle.active === false
        && flagOnly === false
        && both === true
        && legacyLocked === true
        && canonical.ok === true,
      target: idle.target,
      activeWhenIdle: idle.active,
      flagOnlyActivates: flagOnly,
    };
  });
}

function validationEvidence(product) {
  const gtin = validateGtin(EAN);
  const bad = validateGtin("123");
  let missingSku = null;
  try {
    productCore.createProduct({}, { source: "PHASE11", actorId: "phase11" });
    missingSku = "CREATED";
  } catch (err) {
    missingSku = err.message;
  }
  let duplicate = null;
  try {
    productCore.createProduct({
      sku: "PHASE11-SYN-DUP",
      ean: EAN,
      gtin: EAN,
      title: "duplicate",
    }, { source: "PHASE11", actorId: "phase11" });
    duplicate = "CREATED";
  } catch (err) {
    duplicate = err.code;
  }
  const detected = detectDuplicates({
    supplierCode: "api-supplier-dry",
    supplierSku: "OTHER",
    sku: SKU,
    ean: EAN,
    gtin: EAN,
    mpn: "P11-SYN",
  });
  return {
    ok: gtin.ok === true && bad.ok === false && missingSku === "SKU required" && duplicate === "duplicate_ean" && detected.ok === false,
    duplicate,
    detected: detected.issues.length,
  };
}

function recordEvidence(product) {
  const normalized = normalizeSupplierProductRecord({
    sku: SKU,
    supplier_sku: "SUP-PHASE11",
    ean_gtin: EAN,
    mpn: "P11-SYN",
    name: "  Phase 11 synthetic brake pad  ",
    supplier_category: "automotive/bremssystem",
    supplier_price: { amount: 40, currency: "eur" },
    stock: 4,
  }, { supplierCode: "api-supplier-dry", sourceProductId: "src-phase11" });
  const bound = bindProductCategory({ supplier_category: "automotive/bremssystem", sku: SKU });
  const updated = productCore.updateProduct(product.id, { title: "Phase 11 synthetic updated", stock: 4 }, { source: "PHASE11", actorId: "phase11" });
  const history = productAudit.listAudit(product.id);
  const primary = productSot.upsertIdentityMap({
    sourceSystem: "A",
    sourceId: "phase11-source-a",
    sourceSku: "SUP-PHASE11",
    targetProductId: product.id,
    targetSku: SKU,
    mappingStatus: "MAPPED",
    collisionStatus: "NONE",
    confidence: 1,
    evidence: "phase11-primary",
    eanGtin: EAN,
    matchMethod: "EAN",
  });
  const conflict = productSot.upsertIdentityMap({
    sourceSystem: "B",
    sourceId: "phase11-source-b",
    sourceSku: "SUP-PHASE11-B",
    targetProductId: product.id,
    targetSku: SKU,
    mappingStatus: "CONFLICT",
    collisionStatus: "CONFLICT",
    confidence: 0.4,
    evidence: "phase11-conflict-price",
    eanGtin: EAN,
    matchMethod: "EAN",
  });
  const again = productSot.upsertIdentityMap({
    sourceSystem: "A",
    sourceId: "phase11-source-a",
    sourceSku: "SUP-PHASE11",
    targetProductId: product.id,
    targetSku: SKU,
    mappingStatus: "MAPPED",
    collisionStatus: "NONE",
    confidence: 1,
    evidence: "phase11-primary-replay",
    eanGtin: EAN,
  });
  const provenance = buildProvenance({ sourceSupplierCode: "api-supplier-dry", sourceProductId: "src-phase11", actorId: "phase11" });
  const missingProvenance = validateProvenance({});
  const unknown = classifyProductOrigin({});
  const de = envelopeProductContent({ title: "Bremsbelag Set Vorderachse", description: "Synthetic" }, { sourceLocale: "de" });
  const en = de.locales?.en;
  let activation = null;
  try {
    productCore.transitionStatus(product.id, PRODUCT_STATUS.ACTIVE, { source: "PHASE11", actorId: "phase11" });
    activation = "ACTIVATED";
  } catch (err) {
    activation = err.message;
  }
  const afterAttempt = productCore.getProduct(product.id);
  const publish = canPublishProduct({ sku: SKU, title: "incomplete" });
  const dry = publishDryRun(SKU);
  return {
    ok: normalized.supplierSku === "SUP-PHASE11"
      && normalized.currency === "eur"
      && normalized.title.includes("Phase 11 synthetic brake pad")
      && bound.ok === true
      && bound.categoryId === "cat-05"
      && updated.title === "Phase 11 synthetic updated"
      && updated.stock === 4
      && history.some((row) => row.action === "product.create")
      && history.some((row) => row.action === "product.update")
      && primary?.target_sku === SKU
      && conflict?.collision_status === "CONFLICT"
      && again?.id === primary?.id
      && validateProvenance(provenance).ok === true
      && provenance.verified === false
      && missingProvenance.ok === false
      && unknown.origin === "UNKNOWN"
      && de.sourceLocale === "de"
      && de.listed >= 30
      && LOCALES.length >= 30
      && en?.title === "Front axle brake pad set"
      && en?.quality !== "NATIVE"
      && activation !== "ACTIVATED"
      && afterAttempt.status !== PRODUCT_STATUS.ACTIVE
      && publish.ok === false
      && dry.salesWouldChange === false
      && dry.paymentsWouldChange === false,
    categoryId: bound.categoryId,
    history: history.map((row) => row.action),
    collision: conflict?.collision_status || null,
    activation,
    publish: publish.status,
  };
}

function runPhase11Evidence() {
  if (!writesAllowed()) {
    return { ok: false, code: "REFUSED_PRODUCTION_DB", live: false, productionReady: false };
  }
  const identity = identityEvidence();
  const product = ensureProduct();
  const validation = validationEvidence(product);
  const record = recordEvidence(product);
  const failed = ["identity", "validation", "record"].filter((name) => ({ identity, validation, record }[name].ok !== true));
  return {
    ok: failed.length === 0 && productSot.isSotActive() === false,
    failed,
    identity,
    validation,
    record,
    sku: product.sku,
    live: false,
    productionReady: false,
    active: productSot.isSotActive(),
  };
}

module.exports = { runPhase11Evidence, SKU };
