/**
 * Phase 2 — Category, subcategory, attributes, filters (software scope).
 * L2 product SEO copy is tracked in phase 11 / open items, not here.
 */
const fs = require("fs");
const path = require("path");
const { validateTaxonomy } = require("../taxonomy/validateTaxonomy");
const { validateCatalogCoverage, resolveProfile } = require("../pim/subcategoryCatalogProfile");
const { validateHubSeoCoverage } = require("../storefront/hubSeoLocaleService");
const { bindProductCategory } = require("../pim/productCategoryBind");

const ALIAS_FILE = path.join(process.cwd(), "data/taxonomy/supplier_category_aliases.json");

function checkSupplierBrakesAlias() {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(ALIAS_FILE, "utf8"));
  } catch {
    return { id: "CAT_SUPPLIER_BRAKES_ALIAS", ok: false, code: "ALIAS_FILE_MISSING" };
  }
  const target = doc?.aliases?.["automotive/brakes"] || doc?.["automotive/brakes"];
  const mapped = typeof target === "string" ? target : target?.canonical;
  const bind = bindProductCategory({
    supplier_category: "automotive/brakes",
    ean_gtin: "5901234123457",
    mpn: "P85073",
    brand: "ATE",
    title: "Brake pad",
  });
  return {
    id: "CAT_SUPPLIER_BRAKES_ALIAS",
    ok: mapped === "automotive/bremssystem" && bind.ok === true && Boolean(bind.categoryId),
    mapped,
    categoryId: bind.categoryId || null,
  };
}

function checkAutomotiveFilterDepth() {
  const profile = resolveProfile({ subcategoryId: "cat-05-03" });
  return {
    id: "CAT_AUTOMOTIVE_BRAKE_PROFILE",
    ok: profile.ok && profile.filters.length >= 3 && profile.attributes.length >= 2,
    filters: profile.filters?.length || 0,
  };
}

function evaluatePhase2CategoryInfrastructure() {
  const taxonomy = validateTaxonomy();
  const catalog = validateCatalogCoverage();
  const hubSeo = validateHubSeoCoverage();
  const checks = [
    { id: "CAT_TAXONOMY_50", ok: taxonomy.ok && taxonomy.master50 === 50, master50: taxonomy.master50 },
    {
      id: "CAT_L1_TEMPLATES_50",
      ok: catalog.activeL1 === 50 && catalog.templateL1 === 50 && catalog.missingL1.length === 0,
      templateL1: catalog.templateL1,
    },
    {
      id: "CAT_L2_PROFILES_330",
      ok: catalog.ok && catalog.l2Count === 330 && catalog.missingL2Total === 0,
      l2Count: catalog.l2Count,
    },
    {
      id: "CAT_L1_SEO_PRIMARY",
      ok: hubSeo.ok && hubSeo.activeHubs === 50,
      activeHubs: hubSeo.activeHubs,
    },
    checkSupplierBrakesAlias(),
    checkAutomotiveFilterDepth(),
  ];

  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const percent = Math.round((passed / total) * 1000) / 10;

  return {
    phase: 2,
    title: "Kategori, alt kategori, ürün özellikleri ve filtreler",
    ok: passed === total,
    percentComplete: percent,
    passed,
    total,
    checks,
    openInLaterPhases: ["L2 ürün SEO metinleri", "Tüm L2 için profesyonel çeviri"],
    completeClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase2CategoryInfrastructure };