/**
 * Part 15 — Safe product catalog migration into PIM Core (pim_core_products).
 * Supports dry-run (no DB writes) and idempotent import (no silent overwrites).
 */
const fs = require("fs");
const path = require("path");
const { db } = require("../db");
const productCore = require("./productCore");
const productValidation = require("./productValidation");
const productIdentifiers = require("./productIdentifiers");
const brandService = require("./brandService");
const categoryEngine = require("./categoryEngine");
const supplierMapping = require("./supplierMapping");
const mediaService = require("./mediaService");
const { isDemoOrTestProduct, isVariantSkuOfDemoParent, KNOWN_DEMO_SKUS } = require("./demoProductGuard");
const { assertProductionSafety } = require("./productionSafetyGate");
const { PRODUCT_STATUS, AUDIT_SOURCE, VALIDATION_STATUS } = require("../../core/productConstants");

const MIGRATION_STATUS = Object.freeze({
  READY_TO_IMPORT: "READY_TO_IMPORT",
  SKIPPED_DEMO: "SKIPPED_DEMO",
  SKIPPED_DUPLICATE: "SKIPPED_DUPLICATE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  CATEGORY_MAPPING_REQUIRED: "CATEGORY_MAPPING_REQUIRED",
  INVALID_PRODUCT: "INVALID_PRODUCT",
  IMPORTED: "IMPORTED",
});

const SOURCE_PRIORITY = { p1: 3, pim_catalog: 2, legacy: 1 };

const LEGACY_CATEGORY_TO_TAXONOMY = {
  Automotive: "cat-05",
  Garden: "cat-06",
  Home: "cat-07",
  Pet: "cat-08",
  Sports: "cat-09",
  Cleaning: "cat-10",
  Textile: "cat-11",
  Electronics: "cat-12",
};

const PIM_CODE_TO_TAXONOMY = {
  AUT: "cat-05",
  GAR: "cat-06",
  HOM: "cat-07",
  PET: "cat-08",
  SPT: "cat-09",
  CLN: "cat-10",
  TEX: "cat-11",
  ELE: "cat-12",
};

function p1CatalogPath() {
  return path.join(__dirname, "..", "..", "..", "data", "buzzard_products.json");
}

function loadP1Candidates() {
  const filePath = p1CatalogPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return (raw.products || [])
      .filter((p) => p.status === "active")
      .map((p) => normalizeP1Product(p));
  } catch {
    return [];
  }
}

function normalizeP1Product(p) {
  return {
    source: "p1",
    sourceId: p.id,
    sku: String(p.sku || "").trim(),
    title: String(p.name || "").trim(),
    description: String(p.description || p.short_description || "").trim(),
    shortDescription: String(p.short_description || "").trim(),
    brand: String(p.brand || "").trim(),
    category: p.category_id || null,
    ean: p.ean_gtin || null,
    gtin: p.ean_gtin || null,
    price: Number(p.price?.amount) || 0,
    stock: Number(p.stock) || 0,
    supplier: p.supplier_id || null,
    supplierSku: p.supplier_sku || null,
    images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
    attributes: p.attributes || {},
    seo: p.seo || {},
    variants: p.variants || [],
    metadata: { migrationSource: "p1", sourceId: p.id },
  };
}

function loadLegacyCandidates() {
  try {
    const rows = db
      .prepare(`
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.active = 1
      `)
      .all();
    return rows.map((row) => normalizeLegacyProduct(row));
  } catch {
    return [];
  }
}

function normalizeLegacyProduct(row) {
  const category =
    row.category_id && String(row.category_id).startsWith("cat-")
      ? row.category_id
      : LEGACY_CATEGORY_TO_TAXONOMY[row.category_name] || null;

  return {
    source: "legacy",
    sourceId: String(row.id),
    sku: String(row.sku || "").trim(),
    title: String(row.name || "").trim(),
    description: String(row.description || "").trim(),
    shortDescription: String(row.description || "").slice(0, 240),
    brand: row.brand ? String(row.brand).trim() : "",
    category,
    ean: row.ean || null,
    gtin: row.gtin || row.ean || null,
    price: Number(row.price_eur) || 0,
    stock: Number(row.stock) || 0,
    supplier: row.supplier_id || null,
    supplierSku: row.supplier_sku || null,
    images: row.image_url ? [row.image_url] : [],
    attributes: {},
    seo: {
      slug: row.slug || "",
      metaTitle: row.seo_title || row.name,
      metaDescription: row.seo_description || row.description,
    },
    variants: [],
    metadata: { migrationSource: "legacy", sourceId: String(row.id) },
  };
}

function loadPimCatalogCandidates() {
  try {
    const rows = db
      .prepare(`
        SELECT p.*, b.name AS brand_name, c.code AS category_code, c.name AS category_name
        FROM pim_products p
        LEFT JOIN pim_brands b ON b.id = p.brand_id
        LEFT JOIN pim_categories c ON c.id = p.category_id
      `)
      .all();
    return rows.map((row) => normalizePimCatalogProduct(row));
  } catch {
    return [];
  }
}

function normalizePimCatalogProduct(row) {
  const translations = db
    .prepare(
      "SELECT title, short_description, description FROM pim_product_translations WHERE product_id = ? AND language = 'de-DE' LIMIT 1"
    )
    .get(row.id);
  const media = db
    .prepare("SELECT url FROM pim_product_media WHERE product_id = ? AND media_type = 'image' ORDER BY sort_order LIMIT 5")
    .all(row.id);
  const seo = db.prepare("SELECT slug, meta_title, meta_description FROM pim_product_seo WHERE product_id = ?").get(row.id);

  const category = PIM_CODE_TO_TAXONOMY[row.category_code] || null;

  return {
    source: "pim_catalog",
    sourceId: String(row.id),
    sku: String(row.sku || "").trim(),
    title: String(translations?.title || row.sku).trim(),
    description: String(translations?.description || translations?.short_description || "").trim(),
    shortDescription: String(translations?.short_description || "").trim(),
    brand: String(row.brand_name || "").trim(),
    category,
    ean: row.ean || null,
    gtin: row.gtin || row.ean || null,
    price: Number(row.price) || 0,
    stock: Number(row.stock) || 0,
    supplier: null,
    supplierSku: null,
    images: media.map((m) => m.url).filter(Boolean),
    attributes: {},
    seo: seo
      ? { slug: seo.slug, metaTitle: seo.meta_title, metaDescription: seo.meta_description }
      : {},
    variants: [],
    metadata: { migrationSource: "pim_catalog", sourceId: String(row.id) },
  };
}

function collectCandidates({ sources = ["p1", "legacy", "pim_catalog"] } = {}) {
  const bySku = new Map();
  const loaders = {
    p1: loadP1Candidates,
    legacy: loadLegacyCandidates,
    pim_catalog: loadPimCatalogCandidates,
  };

  for (const source of sources) {
    const load = loaders[source];
    if (!load) continue;
    for (const item of load()) {
      if (!item.sku) continue;
      const existing = bySku.get(item.sku);
      if (!existing || SOURCE_PRIORITY[item.source] > SOURCE_PRIORITY[existing.source]) {
        bySku.set(item.sku, item);
      }
    }
  }

  return [...bySku.values()];
}

function resolveBrandId(brandName, { dryRun = true } = {}) {
  const name = String(brandName || "").trim();
  if (!name) return null;

  const existing = db.prepare("SELECT id FROM pim_core_brands WHERE LOWER(name) = LOWER(?)").get(name);
  if (existing) return existing.id;

  if (dryRun) return null;

  try {
    return brandService.createBrand({ name }).id;
  } catch (err) {
    const again = db.prepare("SELECT id FROM pim_core_brands WHERE LOWER(name) = LOWER(?)").get(name);
    if (again) return again.id;
    throw err;
  }
}

function evaluateCandidate(candidate) {
  const row = {
    source: candidate.source,
    sourceId: candidate.sourceId,
    sku: candidate.sku,
    title: candidate.title,
    category: candidate.category,
    brand: candidate.brand || null,
    targetAction: null,
    status: null,
    validation: null,
    rejectionReason: null,
  };

  if (!candidate.sku || !candidate.title || candidate.title.length < 3) {
    row.status = MIGRATION_STATUS.INVALID_PRODUCT;
    row.rejectionReason = "Missing or invalid SKU/title";
    row.targetAction = "SKIP";
    return row;
  }

  if (isDemoOrTestProduct(candidate)) {
    row.status = MIGRATION_STATUS.SKIPPED_DEMO;
    row.rejectionReason = "Demo/test product detected";
    row.targetAction = "SKIP";
    return row;
  }

  if (isVariantSkuOfDemoParent(candidate.sku, KNOWN_DEMO_SKUS)) {
    row.status = MIGRATION_STATUS.SKIPPED_DEMO;
    row.rejectionReason = "Variant of known demo parent SKU";
    row.targetAction = "SKIP";
    return row;
  }

  if (candidate.sku.startsWith("BUZ-AUTO-000001-")) {
    row.status = MIGRATION_STATUS.SKIPPED_DEMO;
    row.rejectionReason = "Variant of test product BUZ-AUTO-000001";
    row.targetAction = "SKIP";
    return row;
  }

  const existing = productCore.getProduct(candidate.sku);
  if (existing) {
    row.status = MIGRATION_STATUS.SKIPPED_DUPLICATE;
    row.rejectionReason = `Already in PIM Core (${existing.id})`;
    row.targetAction = "SKIP";
    return row;
  }

  if (!candidate.category) {
    row.status = MIGRATION_STATUS.CATEGORY_MAPPING_REQUIRED;
    row.rejectionReason = "No taxonomy category mapping available";
    row.targetAction = "SKIP";
    return row;
  }

  const mapping = categoryEngine.getMapping(candidate.category);
  if (!mapping.exists && !categoryEngine.findTaxonomyCategory(candidate.category)) {
    row.status = MIGRATION_STATUS.CATEGORY_MAPPING_REQUIRED;
    row.rejectionReason = `Unknown taxonomy category: ${candidate.category}`;
    row.targetAction = "SKIP";
    return row;
  }

  const validation = productValidation.validateProduct({
    id: "pending",
    sku: candidate.sku,
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    brandId: candidate.brand ? 1 : null,
    ean: candidate.ean,
    gtin: candidate.gtin,
    price: candidate.price,
    stock: candidate.stock,
    images: candidate.images,
    supplier: candidate.supplier,
  });

  row.validation = {
    overall: validation.overall,
    failCount: validation.failCount,
    warningCount: validation.warningCount,
    results: validation.results,
  };

  if (validation.overall === VALIDATION_STATUS.FAIL) {
    row.status = MIGRATION_STATUS.VALIDATION_FAILED;
    row.rejectionReason = validation.results
      .filter((r) => r.status === VALIDATION_STATUS.FAIL)
      .map((r) => `${r.field}: ${r.detail}`)
      .join("; ");
    row.targetAction = "SKIP";
    return row;
  }

  row.status = MIGRATION_STATUS.READY_TO_IMPORT;
  row.targetAction = "CREATE";
  row.initialStatus = PRODUCT_STATUS.IMPORTED;
  row.initialVisibility = "HIDDEN";
  return row;
}

function runDryRun(options = {}) {
  const candidates = collectCandidates(options);
  const items = candidates.map((c) => evaluateCandidate(c));

  const summary = {
    dryRun: true,
    destructive: false,
    productsFound: candidates.length,
    productsEligible: items.filter((i) => i.status === MIGRATION_STATUS.READY_TO_IMPORT).length,
    productsRejected: items.filter((i) => i.targetAction === "SKIP").length,
    demoProductsBlocked: items.filter((i) => i.status === MIGRATION_STATUS.SKIPPED_DEMO).length,
    duplicates: items.filter((i) => i.status === MIGRATION_STATUS.SKIPPED_DUPLICATE).length,
    validationFailures: items.filter((i) => i.status === MIGRATION_STATUS.VALIDATION_FAILED).length,
    categoryMappingRequired: items.filter((i) => i.status === MIGRATION_STATUS.CATEGORY_MAPPING_REQUIRED).length,
    invalidProducts: items.filter((i) => i.status === MIGRATION_STATUS.INVALID_PRODUCT).length,
    publicProductsCreated: 0,
  };

  return { dryRun: true, summary, items };
}

function importCandidate(candidate, { actorId = "migration" } = {}) {
  const evaluation = evaluateCandidate(candidate);
  if (evaluation.status !== MIGRATION_STATUS.READY_TO_IMPORT) {
    return { ...evaluation, imported: false };
  }

  const brandId = resolveBrandId(candidate.brand, { dryRun: false });

  const product = productCore.createProduct(
    {
      sku: candidate.sku,
      supplierSku: candidate.supplierSku,
      ean: candidate.ean,
      gtin: candidate.gtin,
      brandId,
      manufacturer: candidate.brand || null,
      title: candidate.title,
      description: candidate.description,
      shortDescription: candidate.shortDescription,
      category: candidate.category,
      attributes: candidate.attributes,
      price: candidate.price,
      stock: candidate.stock,
      supplier: candidate.supplier,
      status: PRODUCT_STATUS.IMPORTED,
      visibility: "HIDDEN",
      seo: candidate.seo,
      metadata: candidate.metadata,
    },
    { source: AUDIT_SOURCE.IMPORT, actorId }
  );

  if (candidate.category) {
    categoryEngine.assignProductCategory(product.id, candidate.category);
  }

  for (let i = 0; i < candidate.images.length; i += 1) {
    mediaService.addMedia(product.id, {
      url: candidate.images[i],
      altText: candidate.title,
      isPrimary: i === 0,
      sortOrder: i,
    });
  }

  if (candidate.supplier && candidate.supplierSku) {
    try {
      supplierMapping.createMapping({
        supplierId: candidate.supplier,
        supplierSku: candidate.supplierSku,
        internalProductId: product.id,
        internalSku: product.sku,
        ean: candidate.ean,
        confidence: 0.7,
      });
    } catch {
      /* mapping may already exist */
    }
  }

  return {
    ...evaluation,
    status: MIGRATION_STATUS.IMPORTED,
    targetAction: "CREATED",
    productId: product.id,
    imported: true,
  };
}

function runImport(options = {}) {
  assertProductionSafety();

  const candidates = collectCandidates(options);
  const results = [];
  let imported = 0;

  for (const candidate of candidates) {
    const result = importCandidate(candidate, { actorId: options.actorId || "pim-import" });
    results.push(result);
    if (result.imported) imported += 1;
  }

  const dry = runDryRun(options);
  return {
    dryRun: false,
    summary: {
      ...dry.summary,
      imported,
      publicProductsCreated: 0,
    },
    items: results,
  };
}

module.exports = {
  MIGRATION_STATUS,
  collectCandidates,
  evaluateCandidate,
  runDryRun,
  runImport,
  importCandidate,
  loadP1Candidates,
  loadLegacyCandidates,
  loadPimCatalogCandidates,
  normalizeP1Product,
  resolveBrandId,
};
