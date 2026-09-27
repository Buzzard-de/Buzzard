/**
 * Migration validator. BLOCK findings prevent EXCLUSIVE activation.
 * Does not mutate catalog data.
 */
const { db } = require("./db");
const productSot = require("./productSot");

function finding(level, code, message, extra = {}) {
  return { level, code, message, ...extra };
}

function validateMigration() {
  const findings = [];

  const missingId = db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE id IS NULL OR id = ''").get().n;
  if (missingId) findings.push(finding("BLOCK", "MISSING_CANONICAL_ID", `${missingId} D products missing id`));

  const dupSku = db
    .prepare("SELECT sku, COUNT(*) n FROM pim_core_products GROUP BY sku HAVING n > 1")
    .all();
  if (dupSku.length) findings.push(finding("BLOCK", "DUPLICATE_SKU", "Duplicate SKUs in D", { rows: dupSku }));

  const dupEan = db
    .prepare(
      "SELECT ean, COUNT(*) n FROM pim_core_products WHERE ean IS NOT NULL AND ean != '' GROUP BY ean HAVING n > 1"
    )
    .all();
  if (dupEan.length) findings.push(finding("BLOCK", "DUPLICATE_EAN", "Duplicate EANs in D", { rows: dupEan }));

  const orphanCategory = db
    .prepare(
      `SELECT COUNT(*) n FROM pim_core_products p
       WHERE p.taxonomy_category_id IS NOT NULL AND p.taxonomy_category_id != ''
         AND NOT EXISTS (SELECT 1 FROM categories WHERE id = p.taxonomy_category_id OR CAST(id AS TEXT) = p.taxonomy_category_id)`
    )
    .get().n;
  if (orphanCategory) {
    findings.push(finding("WARN", "ORPHAN_CATEGORY", `${orphanCategory} products reference unknown categories`));
  }

  const orphanSupplier = db
    .prepare(
      `SELECT COUNT(*) n FROM pim_core_supplier_mappings m
       WHERE m.internal_product_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pim_core_products p WHERE p.id = m.internal_product_id)`
    )
    .get().n;
  if (orphanSupplier) {
    findings.push(finding("WARN", "ORPHAN_SUPPLIER_MAPPING", `${orphanSupplier} supplier mappings without D product`));
  }

  const orphanMarket = db
    .prepare(
      `SELECT COUNT(*) n FROM marketplace_product_map m
       WHERE m.product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pim_core_products p WHERE p.id = m.product_id)`
    )
    .get().n;
  if (orphanMarket) {
    findings.push(finding("WARN", "ORPHAN_MARKETPLACE_MAPPING", `${orphanMarket} marketplace maps without D product`));
  }

  const missingPrice = db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE price IS NULL OR price < 0").get().n;
  if (missingPrice) findings.push(finding("WARN", "MISSING_PRICE", `${missingPrice} products missing or invalid price`));

  const invalidInventory = db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE stock < 0").get().n;
  if (invalidInventory) {
    findings.push(finding("BLOCK", "INVALID_INVENTORY", `${invalidInventory} products with negative stock`));
  }

  const confirmedCollisions = db
    .prepare("SELECT COUNT(*) n FROM product_identity_map WHERE collision_status IN ('CONFIRMED','POSSIBLE')")
    .get().n;
  if (confirmedCollisions) {
    findings.push(finding("BLOCK", "PRODUCT_IDENTITY_CONFLICT", `${confirmedCollisions} identity collisions unresolved`));
  }

  if (process.env.BUZZARD_PRODUCT_IDENTITY_PRODUCTION_EXPORT !== "1") {
    findings.push(
      finding(
        "BLOCK",
        "BLOCKED_BY_PRODUCTION_ACCESS",
        "Production A–G identity export is not available; exclusive SoT stays off"
      )
    );
  }

  const blocks = findings.filter((f) => f.level === "BLOCK");
  const warns = findings.filter((f) => f.level === "WARN");
  const result = blocks.length ? "BLOCK" : warns.length ? "WARN" : "PASS";

  return {
    result,
    canActivateExclusive: result !== "BLOCK",
    sot: productSot.getStatus(),
    findings,
    counts: { block: blocks.length, warn: warns.length },
  };
}

function validateIdentityExport(exportDoc) {
  if (!exportDoc || typeof exportDoc !== "object" || !exportDoc.sources) {
    return {
      result: "BLOCK",
      canActivateExclusive: false,
      findings: [
        finding(
          "BLOCK",
          "BLOCKED_BY_PRODUCTION_ACCESS",
          "No real A–G identity export provided. Exclusive SoT stays off."
        ),
      ],
      counts: { block: 1, warn: 0 },
    };
  }

  const findings = [];
  const eans = new Map();
  const skus = new Map();
  const sourceIds = new Map();
  const sources = exportDoc.sources;

  for (const key of ["A", "B", "C", "D", "E", "F", "G"]) {
    const rows = Array.isArray(sources[key]) ? sources[key] : [];
    for (const row of rows) {
      const sid = String(row.id || row.sourceId || "").trim();
      const sku = String(row.sku || "").trim();
      const ean = String(row.ean || row.ean_gtin || row.gtin || "").trim();
      if (!sid) findings.push(finding("BLOCK", "MISSING_CANONICAL_ID", `Source ${key} row missing id`));
      if (sid) {
        const k = `${key}:${sid}`;
        if (sourceIds.has(k)) {
          findings.push(finding("BLOCK", "CONFLICTING_SOURCE_ID", `Duplicate source id ${k}`));
        }
        sourceIds.set(k, true);
      }
      if (sku) {
        const prev = skus.get(sku);
        if (prev && prev !== `${key}:${sid}`) {
          findings.push(finding("BLOCK", "DUPLICATE_SKU", `SKU ${sku} on ${prev} and ${key}:${sid}`));
        }
        skus.set(sku, `${key}:${sid}`);
      }
      if (ean) {
        const prev = eans.get(ean);
        if (prev && prev !== `${key}:${sid}`) {
          findings.push(finding("WARN", "DUPLICATE_EAN", `EAN ${ean} on ${prev} and ${key}:${sid}`));
        }
        eans.set(ean, `${key}:${sid}`);
      }
    }
  }

  if (exportDoc.orphans > 0) {
    findings.push(finding("BLOCK", "ORPHAN_MAPPING", `${exportDoc.orphans} orphan mappings`));
  }
  if (Array.isArray(exportDoc.collisions) && exportDoc.collisions.length) {
    findings.push(finding("BLOCK", "PRODUCT_IDENTITY_CONFLICT", `${exportDoc.collisions.length} collisions unresolved`));
  }
  if (Array.isArray(exportDoc.unresolved) && exportDoc.unresolved.length) {
    findings.push(finding("WARN", "UNRESOLVED_IDENTITY", `${exportDoc.unresolved.length} unresolved identities`));
  }

  const local = validateMigration();
  findings.push(...local.findings);

  const blocks = findings.filter((f) => f.level === "BLOCK");
  const warns = findings.filter((f) => f.level === "WARN");
  const result = blocks.length ? "BLOCK" : warns.length ? "WARN" : "PASS";
  return { result, canActivateExclusive: result !== "BLOCK", findings, counts: { block: blocks.length, warn: warns.length } };
}

module.exports = { validateMigration, validateIdentityExport };
