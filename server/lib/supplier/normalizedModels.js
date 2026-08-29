/** Normalized supplier/product models — Part 5 */

function emptyProduct(overrides = {}) {
  return {
    sku: null,
    ean: null,
    gtin: null,
    name: null,
    brand: null,
    categoryId: null,
    description: null,
    images: [],
    price: null,
    currency: "EUR",
    stock: 0,
    availability: "unknown",
    supplierId: null,
    raw: null,
    ...overrides,
  };
}

function emptySupplier(overrides = {}) {
  return {
    id: null,
    name: null,
    format: "REST",
    capabilities: [],
    ...overrides,
  };
}

module.exports = { emptyProduct, emptySupplier };
