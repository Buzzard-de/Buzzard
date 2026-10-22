/**
 * Explicit domain isolation for machinery search engines.
 * Shared utilities may be reused; compatibility and ranking must stay domain-local.
 */

const DOMAINS = Object.freeze({
  AGRICULTURAL: "agricultural",
  CONSTRUCTION: "construction",
  AUTOMOTIVE: "automotive",
  NONE: "none",
});

const SHOP_L1 = Object.freeze({
  agricultural: "cat-20",
  construction: "cat-55",
  automotive: "cat-05",
});

function normalizeCategoryId(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveMachineryDomain(input = {}) {
  const categoryId = normalizeCategoryId(input.categoryId || input.shopCategoryId || input.domainHint);
  if (categoryId.startsWith("ame-cat-") || categoryId === "agricultural" || categoryId.startsWith("cat-20")) {
    return DOMAINS.AGRICULTURAL;
  }
  if (categoryId.startsWith("cme-cat-") || categoryId === "construction" || categoryId.startsWith("cat-55")) {
    return DOMAINS.CONSTRUCTION;
  }
  if (
    categoryId.startsWith("vpe-cat-") ||
    categoryId.startsWith("cat-05") ||
    categoryId.startsWith("cat-54") ||
    categoryId === "automotive" ||
    categoryId === "commercial" ||
    categoryId.startsWith("veh-")
  ) {
    return DOMAINS.AUTOMOTIVE;
  }
  if (input.domain === DOMAINS.AGRICULTURAL || input.engine === "agricultural") return DOMAINS.AGRICULTURAL;
  if (input.domain === DOMAINS.CONSTRUCTION || input.engine === "construction") return DOMAINS.CONSTRUCTION;
  if (input.domain === DOMAINS.AUTOMOTIVE || input.engine === "automotive") return DOMAINS.AUTOMOTIVE;
  return DOMAINS.NONE;
}

function assertAgriculturalScope(input = {}) {
  const domain = resolveMachineryDomain(input);
  if (domain === DOMAINS.AGRICULTURAL) return { ok: true, domain };
  return {
    ok: false,
    domain,
    error: "domain_isolation",
    message: "Agricultural machinery engine refuses construction, automotive, and unscoped requests.",
  };
}

function assertConstructionScope(input = {}) {
  const domain = resolveMachineryDomain(input);
  if (domain === DOMAINS.CONSTRUCTION) return { ok: true, domain };
  return {
    ok: false,
    domain,
    error: "domain_isolation",
    message: "Construction machinery engine refuses agricultural, automotive, and unscoped requests.",
  };
}

function assertAutomotiveScope(input = {}) {
  const domain = resolveMachineryDomain(input);
  if (domain === DOMAINS.AUTOMOTIVE) return { ok: true, domain };
  return {
    ok: false,
    domain,
    error: "domain_isolation",
    message: "Automotive vehicle-parts engine refuses agricultural, construction, and unscoped requests.",
  };
}

function shopCategoryFor(domain) {
  return SHOP_L1[domain] || null;
}

function isCommercialVehicleClass(vehicleClass) {
  return ["truck", "bus", "trailer", "semi-trailer", "heavy-commercial", "lcv"].includes(
    String(vehicleClass || "").toLowerCase()
  );
}

function assertPersistOwnership(domain, record = {}) {
  const allowed = [DOMAINS.AUTOMOTIVE, DOMAINS.AGRICULTURAL, DOMAINS.CONSTRUCTION];
  if (!allowed.includes(domain)) {
    return { ok: false, error: "unknown_domain", domain, items: [] };
  }
  if (record.domain && record.domain !== domain) {
    return { ok: false, error: "domain_mismatch", domain: record.domain, items: [] };
  }
  const categoryId = record.categoryId || record.shopCategoryId;
  if (categoryId) {
    const resolved = resolveMachineryDomain({ categoryId, domain });
    if (resolved !== DOMAINS.NONE && resolved !== domain) {
      return { ok: false, error: "category_domain_mismatch", domain: resolved, items: [] };
    }
  }
  return { ok: true, domain };
}

module.exports = {
  DOMAINS,
  SHOP_L1,
  resolveMachineryDomain,
  assertAgriculturalScope,
  assertConstructionScope,
  assertAutomotiveScope,
  assertPersistOwnership,
  shopCategoryFor,
  isCommercialVehicleClass,
};
