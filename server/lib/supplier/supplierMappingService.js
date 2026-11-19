/**
 * Part 23 — Supplier → PIM product mapping (reuses Part 16/22 normalizers).
 * Active category identity is the 50 shop L1 ids from the category master JSON.
 * This resolver reads those files only. It does not open SQLite, call a supplier,
 * or publish a product.
 */
const fs = require("fs");
const path = require("path");
const { normalizeBrand } = require("../pim/brandNormalizer");
const { normalizeSku } = require("../pim/skuNormalizer");
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

const ROOT = path.join(__dirname, "..", "..", "..");
const SHOP_FILE = path.join(ROOT, "data", "buzzard_categories.json");
const RETIRED_FILE = path.join(ROOT, "data", "taxonomy", "retired_shop_l1.json");
const MASTER_FILE = path.join(ROOT, "data", "taxonomy", "buzzard_master_50_main_categories.json");
const CROSSWALK_FILE = path.join(ROOT, "data", "taxonomy", "master_shop_l1_mapping.json");
const HUB_FILE = path.join(ROOT, "data", "taxonomy", "shop_hub_l1_extensions.json");
const SUPPLIER_ALIAS_FILE = path.join(ROOT, "data", "taxonomy", "supplier_category_aliases.json");

let catalogCache = null;
let supplierAliasCache = null;

function loadSupplierCategoryAliases() {
  if (supplierAliasCache) return supplierAliasCache;
  if (!fs.existsSync(SUPPLIER_ALIAS_FILE)) {
    supplierAliasCache = new Map();
    return supplierAliasCache;
  }
  const doc = JSON.parse(fs.readFileSync(SUPPLIER_ALIAS_FILE, "utf8"));
  supplierAliasCache = new Map(
    Object.entries(doc.aliases || {}).map(([from, to]) => [String(from).trim().toLowerCase(), String(to).trim()])
  );
  return supplierAliasCache;
}

function normalizeSupplierCategoryPath(supplierCategory) {
  const raw = String(supplierCategory || "").trim();
  if (!raw) return raw;
  const aliases = loadSupplierCategoryAliases();
  return aliases.get(raw.toLowerCase()) || raw;
}

function isRetiredShopId(id, retiredShop) {
  const value = String(id || "");
  return retiredShop.has(value) || value.startsWith("cat-25-") || value.startsWith("cat-43-") || value.startsWith("cat-46-");
}

function groupRecords(records, field) {
  const groups = new Map();
  for (const record of records) {
    const key = String(record[field] || "").toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return groups;
}

function loadActiveCatalog() {
  if (catalogCache) return catalogCache;

  const shop = JSON.parse(fs.readFileSync(SHOP_FILE, "utf8"));
  const retiredDoc = JSON.parse(fs.readFileSync(RETIRED_FILE, "utf8"));
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const crosswalk = JSON.parse(fs.readFileSync(CROSSWALK_FILE, "utf8"));
  const hubs = JSON.parse(fs.readFileSync(HUB_FILE, "utf8"));

  const retiredShop = new Set((retiredDoc.retired || []).map((row) => row.shop_id));
  const retiredMaster = new Set(
    [...(master.retired_codes || []), ...(retiredDoc.retired || []).map((row) => row.master_code)]
      .filter(Boolean)
      .map((code) => String(code).toLowerCase())
  );

  const nodes = [];
  function visit(node, ancestors, root, retired) {
    const trail = [...ancestors, node];
    const record = {
      id: node.id,
      name: node.name,
      slug: node.slug,
      level: node.level || trail.length,
      slugPath: trail.map((item) => String(item.slug || "").toLowerCase()).join("/"),
      retired,
      activeCategory: retired
        ? null
        : {
            id: root.id,
            name: root.name,
            slug: root.slug,
            menuOrder: root.menu_order,
          },
    };
    nodes.push(record);
    for (const child of node.children || []) visit(child, trail, root, retired);
  }

  for (const root of shop.categories || []) {
    visit(root, [], root, isRetiredShopId(root.id, retiredShop));
  }

  const active = nodes
    .filter((record) => !record.retired && record.level === 1)
    .map((record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      menuOrder: record.activeCategory.menuOrder,
      level: 1,
    }))
    .sort((a, b) => a.menuOrder - b.menuOrder);

  if (active.length !== 50) {
    throw new Error(`ACTIVE_CATEGORY_COUNT_${active.length}`);
  }

  const activeIds = new Set(active.map((category) => category.id));
  const masterToActive = new Map();
  for (const row of crosswalk.mappings || []) {
    if (!activeIds.has(row.shop_id)) continue;
    const code = String(row.master_code || "").toLowerCase();
    if (!masterToActive.has(code)) masterToActive.set(code, []);
    const list = masterToActive.get(code);
    if (!list.includes(row.shop_id)) list.push(row.shop_id);
  }

  const activeNodes = nodes.filter((record) => !record.retired);
  const retiredNodes = nodes.filter((record) => record.retired);

  catalogCache = {
    active,
    byId: new Map(nodes.map((record) => [String(record.id).toLowerCase(), record])),
    activeBySlugPath: new Map(activeNodes.map((record) => [record.slugPath, record])),
    retiredBySlugPath: new Map(retiredNodes.map((record) => [record.slugPath, record])),
    activeBySlug: groupRecords(activeNodes, "slug"),
    retiredBySlug: groupRecords(retiredNodes, "slug"),
    activeByName: groupRecords(activeNodes, "name"),
    retiredByName: groupRecords(retiredNodes, "name"),
    masterToActive,
    retiredMaster,
    hubIds: new Set((hubs.hubs || []).map((hub) => String(hub.shop_id).toLowerCase())),
    hubSlugs: new Set((hubs.hubs || []).map((hub) => String(hub.slug || "").toLowerCase())),
  };
  return catalogCache;
}

function acceptRecord(record) {
  const active = record.activeCategory;
  const subcategory = record.id === active.id ? null : record;
  return {
    ok: true,
    code: "CATEGORY_MATCHED",
    categoryId: active.id,
    catalog: {
      id: active.id,
      name: active.name,
      slug: active.slug,
      menuOrder: active.menuOrder,
      level: 1,
      activeCategoryId: active.id,
      subcategoryId: subcategory ? subcategory.id : null,
      subcategoryName: subcategory ? subcategory.name : null,
      subcategorySlug: subcategory ? subcategory.slug : null,
      sellable: true,
    },
  };
}

function refuse(code, extras = {}) {
  return {
    ok: false,
    code,
    categoryId: null,
    catalog: null,
    sellable: false,
    candidates: [],
    ...extras,
  };
}

function uniqueOrAmbiguous(matches) {
  if (matches.length === 1) return acceptRecord(matches[0]);
  if (matches.length > 1) {
    return refuse("CATEGORY_AMBIGUOUS", { candidates: matches.map((record) => record.id) });
  }
  return null;
}

function looksLikeCatalogId(value) {
  return /^cat-\d/i.test(value) || /^bz\.\d{2}$/i.test(value);
}

function lookupToken(raw, { freeText = false } = {}) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return refuse("CATEGORY_INVALID");

  const catalog = loadActiveCatalog();
  const idKey = looksLikeCatalogId(trimmed) ? trimmed.toLowerCase() : trimmed;
  const key = idKey.toLowerCase();

  if (catalog.hubIds.has(key) || catalog.hubSlugs.has(key)) return refuse("CATEGORY_HUB");

  const byId = catalog.byId.get(key);
  if (byId?.retired || catalog.retiredMaster.has(key) || catalog.retiredBySlugPath.has(key)) {
    return refuse("CATEGORY_RETIRED");
  }
  if (catalog.retiredBySlug.get(key) || catalog.retiredByName.get(key)) return refuse("CATEGORY_RETIRED");
  if (byId && !byId.retired) return acceptRecord(byId);

  const byPath = catalog.activeBySlugPath.get(key);
  if (byPath) return acceptRecord(byPath);

  const bySlug = uniqueOrAmbiguous(catalog.activeBySlug.get(key) || []);
  if (bySlug) return bySlug;
  const byName = uniqueOrAmbiguous(catalog.activeByName.get(key) || []);
  if (byName) return byName;

  const masterHits = catalog.masterToActive.get(key) || [];
  if (masterHits.length === 1) return acceptRecord(catalog.byId.get(masterHits[0]));
  if (masterHits.length > 1) return refuse("CATEGORY_AMBIGUOUS", { candidates: [...masterHits] });

  if (freeText && !looksLikeCatalogId(idKey)) return refuse("CATEGORY_UNMAPPED");
  return refuse("CATEGORY_UNKNOWN");
}

function listActiveCatalogCategories() {
  return loadActiveCatalog().active.map((category) => ({ ...category }));
}

function finishCategory(decision, supplierCategory) {
  return {
    ok: decision.ok,
    categoryId: decision.ok ? decision.categoryId : null,
    catalog: decision.catalog || null,
    candidates: decision.candidates || [],
    supplierCategory: supplierCategory || null,
    status: decision.ok ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
    code: decision.code,
    sellable: decision.ok === true,
    publicProductCreated: false,
  };
}

/**
 * Pure supplier-category → active catalog category mapper.
 * The sellable identity is one of the 50 active L1 categories.
 * A subcategory is kept only when its ancestor is exactly one of those 50.
 * Retired, hub, unknown, and ambiguous values are refused without a guess.
 */
function mapActiveCatalogCategory(supplierCategory, buzzardCategory) {
  const explicit = buzzardCategory != null && String(buzzardCategory).trim() !== "";
  if (explicit) return finishCategory(lookupToken(buzzardCategory, { freeText: false }));

  const supplier = String(supplierCategory || "").trim();
  if (!supplier) return finishCategory(refuse("CATEGORY_MISSING"));
  const normalized = normalizeSupplierCategoryPath(supplier);
  return finishCategory(lookupToken(normalized, { freeText: true }), supplier);
}

function mapSupplierCategory(supplierCategory, buzzardCategory) {
  return mapActiveCatalogCategory(supplierCategory, buzzardCategory);
}

function identifierValidators() {
  return require("./supplierIdentity");
}

function mapSupplierProduct(raw, { supplierId = null, buzzardCategory = null } = {}) {
  const { validateGtin, validateMpn } = identifierValidators();
  const findings = [];
  const supplierSku = raw.supplier_sku || raw.supplierSku || raw.sku || "";
  const skuNorm = normalizeSku(supplierSku);
  if (!skuNorm.ok) {
    findings.push({ field: "supplierSku", code: "SKU_INVALID", status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const gtinCheck = validateGtin(raw.ean_gtin || raw.gtin || raw.ean);
  if (!gtinCheck.ok) {
    findings.push({ field: "gtin", code: gtinCheck.code.toUpperCase(), status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const mpnCheck = validateMpn(raw.mpn);
  if (!mpnCheck.ok) {
    findings.push({ field: "mpn", code: mpnCheck.code.toUpperCase(), status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const brandNorm = normalizeBrand(raw.brand);
  if (!brandNorm.ok) {
    findings.push({ field: "brand", code: "BRAND_MISSING", status: SUPPLIER_READINESS_STATUS.BLOCKED });
  } else if (brandNorm.unknown) {
    findings.push({ field: "brand", code: "BRAND_UNKNOWN", status: SUPPLIER_READINESS_STATUS.CONDITION });
  }

  const supplier = String(supplierId || "").trim();
  if (!supplier || supplier.toLowerCase() === "unknown") {
    findings.push({ field: "supplierId", code: "SUPPLIER_ID_MISSING", status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const supplierCategory = String(raw.supplier_category || raw.category || "").trim();
  const explicitCategory = buzzardCategory || raw.buzzard_category;
  let categoryMap;
  if (!supplierCategory) {
    findings.push({
      field: "supplierCategory",
      code: "SUPPLIER_CATEGORY_MISSING",
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
    });
    categoryMap = mapSupplierCategory(null, explicitCategory);
  } else {
    const supplierDecision = mapActiveCatalogCategory(supplierCategory);
    const explicitDecision =
      explicitCategory != null && String(explicitCategory).trim() !== ""
        ? mapActiveCatalogCategory(null, explicitCategory)
        : null;
    if (!supplierDecision.ok) categoryMap = supplierDecision;
    else if (explicitDecision && !explicitDecision.ok) categoryMap = explicitDecision;
    else if (explicitDecision && explicitDecision.categoryId !== supplierDecision.categoryId) {
      categoryMap = finishCategory(refuse("CATEGORY_MISMATCH", {
        candidates: [supplierDecision.categoryId, explicitDecision.categoryId],
      }));
    } else categoryMap = supplierDecision;
    if (!categoryMap.ok) {
      findings.push({
        field: "category",
        code: categoryMap.code,
        status: categoryMap.status,
      });
    }
  }

  const images = Array.isArray(raw.images) ? raw.images : raw.image_url ? [raw.image_url] : [];
  if (!images.length) {
    findings.push({ field: "images", code: "IMAGE_MISSING", status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const blocked = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.BLOCKED);
  const condition = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.CONDITION);
  const catalog = {
    sku: skuNorm.ok ? skuNorm.normalized : null,
    ean: gtinCheck.ok ? gtinCheck.value : null,
    gtin: gtinCheck.ok ? gtinCheck.value : null,
    mpn: mpnCheck.ok ? mpnCheck.value : null,
    brand: brandNorm.ok ? brandNorm.normalized : null,
    supplierId: supplier && supplier.toLowerCase() !== "unknown" ? supplier : null,
    activeCategoryId: categoryMap.ok ? categoryMap.categoryId : null,
    supplierCategory: supplierCategory || null,
    subcategoryId: categoryMap.catalog?.subcategoryId || null,
    publicProductCreated: false,
    published: false,
    pimWrite: false,
  };

  const mapped = {
    supplierId: catalog.supplierId,
    supplierSku: catalog.sku || supplierSku,
    internalSku: catalog.sku || supplierSku,
    gtin: catalog.gtin,
    mpn: catalog.mpn,
    brand: catalog.brand,
    brandCanonical: brandNorm.canonical,
    categoryId: catalog.activeCategoryId,
    supplierCategory: catalog.supplierCategory,
    catalogCategory: categoryMap.catalog || null,
    catalog,
    title: raw.name || raw.title || "",
    description: raw.description || "",
    sourcePrice: raw.supplier_price?.amount ?? raw.price ?? null,
    currency: raw.supplier_price?.currency || raw.currency || "EUR",
    sourceStock: Number(raw.stock ?? 0),
    images,
    publicProductCreated: false,
    published: false,
  };

  return {
    ok: !blocked,
    status: blocked
      ? SUPPLIER_READINESS_STATUS.BLOCKED
      : condition
        ? SUPPLIER_READINESS_STATUS.CONDITION
        : SUPPLIER_READINESS_STATUS.PASS,
    mapped,
    catalog,
    findings,
    publicProductCreated: false,
    published: false,
    pimWrite: false,
  };
}

module.exports = {
  listActiveCatalogCategories,
  mapActiveCatalogCategory,
  mapSupplierProduct,
  mapSupplierCategory,
};
