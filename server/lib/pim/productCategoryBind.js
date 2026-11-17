/**
 * Bind a supplier record to one of the 50 active catalog categories.
 * Does not write PIM, publish, or auto-approve REVIEW_REQUIRED.
 */
const { mapActiveCatalogCategory } = require("../supplier/supplierMappingService");
const { classifyProductOrigin } = require("./productOrigin");

function bindProductCategory(record = {}) {
  const origin = classifyProductOrigin(record);
  const mapped = mapActiveCatalogCategory(record.supplier_category || record.category, record.buzzard_category);
  if (!mapped.ok) {
    return {
      ok: false,
      bound: false,
      pimWrite: false,
      published: false,
      salesEnabled: false,
      live: false,
      origin: origin.origin,
      code: mapped.code,
      supplierCategory: mapped.supplierCategory,
      categoryId: null,
    };
  }
  return {
    ok: true,
    bound: true,
    pimWrite: false,
    published: false,
    salesEnabled: false,
    live: false,
    origin: origin.origin,
    code: mapped.code,
    categoryId: mapped.categoryId,
    catalog: mapped.catalog,
    subcategoryId: mapped.catalog?.subcategoryId || null,
  };
}

module.exports = { bindProductCategory };
