/**
 * Automotive Core — supplier abstraction (mock/dry-run only by default).
 */
const mockAdapter = require("../../lib/adapters/mockSupplierAdapter");
const categoryMapping = require("../../lib/catalog/categoryMapping");
const { assertAutomotiveCoreSafety } = require("./safetyPolicy");

function isSupplierLive() {
  return (
    process.env.REAL_SUPPLIER_LIVE_IMPORT === "1" ||
    process.env.SUPPLIER_API_LIVE === "1" ||
    process.env.SUPPLIER_XML_LIVE === "1"
  );
}

function createSupplierAdapter(type = "mock") {
  if (isSupplierLive()) {
    return {
      type: "blocked",
      live: false,
      getProducts: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getProduct: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getStock: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getPrice: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      createOrder: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getOrderStatus: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getTracking: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
    };
  }

  if (type === "dry_run") {
    return {
      type: "dry_run",
      dryRun: true,
      getProducts: async () => ({ ok: true, dryRun: true, products: [], source: "SUPPLIER_DRY_RUN" }),
      getProduct: async (id) => ({ ok: true, dryRun: true, id, product: null }),
      getStock: async () => ({ ok: true, dryRun: true, stock: { status: "UNKNOWN" } }),
      getPrice: async () => ({ ok: true, dryRun: true, price: null }),
      createOrder: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getOrderStatus: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
      getTracking: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
    };
  }

  return {
    type: "mock",
    mock: true,
    getProducts: async () => mockAdapter.fetchCatalog?.() || { ok: true, mock: true, products: [] },
    getProduct: async (id) => ({ ok: true, mock: true, id, product: null }),
    getStock: async () => ({ ok: true, mock: true, stock: { status: "UNKNOWN" } }),
    getPrice: async () => ({ ok: true, mock: true, price: null }),
    createOrder: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
    getOrderStatus: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
    getTracking: async () => ({ ok: false, errorKey: "AUTOMOTIVE_LIVE_DISABLED" }),
  };
}

function resolveSupplierCategoryMapping(supplierId, sourceCategory) {
  return categoryMapping.resolveSupplierCategory(supplierId, sourceCategory);
}

function listSuppliers() {
  return [
    {
      id: "mock",
      name: "Mock Supplier",
      country: "DE",
      status: "MOCK",
      apiType: "mock",
      credentialsConfigured: false,
      supportsDropshipping: false,
      supportsStock: true,
      supportsPrice: true,
      supportsOrders: false,
      live: false,
    },
  ];
}

function getSupplierStatus() {
  const safety = assertAutomotiveCoreSafety();
  return {
    count: listSuppliers().length,
    live: isSupplierLive(),
    apiConfigured: Boolean(process.env.SUPPLIER_API_KEY),
    xmlConfigured: Boolean(process.env.SUPPLIER_XML_URL),
    dryRun: process.env.REAL_SUPPLIER_DRY_RUN !== "0",
    compliant: !isSupplierLive() && safety.compliant,
  };
}

module.exports = {
  isSupplierLive,
  createSupplierAdapter,
  resolveSupplierCategoryMapping,
  listSuppliers,
  getSupplierStatus,
};
