/**
 * Part 23 — Supplier → PIM product mapping (reuses Part 16/22 normalizers).
 */
const { normalizeBrand } = require("../pim/brandNormalizer");
const { normalizeSku } = require("../pim/skuNormalizer");
const { validateGtin } = require("./realSupplierConnector");
const { validateMpn } = require("./realSupplierConnector");
const { resolveProductCategory } = require("../pim/categoryResolver");
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

function mapSupplierCategory(supplierCategory, buzzardCategory, supplierId = null) {
  const resolved = resolveProductCategory({
    supplierId,
    supplierCategory,
    buzzardCategoryHint: buzzardCategory,
  });

  if (resolved.ok) {
    return {
      ok: true,
      categoryId: resolved.categoryId,
      status: SUPPLIER_READINESS_STATUS.PASS,
      mappingSource: resolved.mappingSource,
    };
  }

  if (resolved.status === "REVIEW_REQUIRED") {
    return {
      ok: false,
      supplierCategory,
      categoryId: null,
      status: SUPPLIER_READINESS_STATUS.CONDITION,
      code: resolved.code || "CATEGORY_UNMAPPED",
      message: resolved.message,
    };
  }

  return {
    ok: false,
    categoryId: buzzardCategory || null,
    status: SUPPLIER_READINESS_STATUS.BLOCKED,
    code: resolved.code || "CATEGORY_UNKNOWN",
  };
}

function mapSupplierProduct(raw, { supplierId = "unknown", buzzardCategory = null } = {}) {
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

  const categoryMap = mapSupplierCategory(
    raw.supplier_category || raw.category,
    buzzardCategory || raw.buzzard_category,
    supplierId
  );
  if (!categoryMap.ok) {
    findings.push({
      field: "category",
      code: categoryMap.code,
      status: categoryMap.status,
    });
  }

  const images = Array.isArray(raw.images) ? raw.images : raw.image_url ? [raw.image_url] : [];
  if (!images.length) {
    findings.push({ field: "images", code: "IMAGE_MISSING", status: SUPPLIER_READINESS_STATUS.BLOCKED });
  }

  const blocked = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.BLOCKED);
  const condition = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.CONDITION);

  const mapped = {
    supplierId,
    supplierSku: skuNorm.normalized || supplierSku,
    internalSku: skuNorm.normalized || supplierSku,
    gtin: gtinCheck.ok ? gtinCheck.value : null,
    mpn: mpnCheck.ok ? mpnCheck.value : null,
    brand: brandNorm.normalized,
    brandCanonical: brandNorm.canonical,
    categoryId: categoryMap.categoryId || null,
    title: raw.name || raw.title || "",
    description: raw.description || "",
    sourcePrice: raw.supplier_price?.amount ?? raw.price ?? null,
    currency: raw.supplier_price?.currency || raw.currency || "EUR",
    sourceStock: Number(raw.stock ?? 0),
    images,
  };

  return {
    ok: !blocked,
    status: blocked
      ? SUPPLIER_READINESS_STATUS.BLOCKED
      : condition
        ? SUPPLIER_READINESS_STATUS.CONDITION
        : SUPPLIER_READINESS_STATUS.PASS,
    mapped,
    findings,
  };
}

module.exports = {
  mapSupplierProduct,
  mapSupplierCategory,
};
