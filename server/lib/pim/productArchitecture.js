/**
 * Evidence-based product store architecture inventory.
 * Not a Source of Truth and not a second orchestrator.
 * Dual-write remains forbidden. Product SoT stays inactive.
 */

const WRITER_CLASS = Object.freeze({
  A_MASTER: "A_MASTER",
  B_READ_MODEL: "B_READ_MODEL",
  C_SEED: "C_SEED",
  D_PROJECTION: "D_PROJECTION",
  E_RELATED: "E_RELATED",
});

const MASTER_WRITERS = Object.freeze([
  {
    id: "productCore.createProduct",
    module: "server/lib/pim/productCore.js",
    destination: "pim_core_products",
    operations: ["create"],
    boundary: "authorizeCreate",
    requireExplicitAuth: false,
    notes: "Inherited ADMIN/IMPORT/SYSTEM+actorId. Canonical candidate persist target.",
  },
  {
    id: "productCore.updateProduct",
    module: "server/lib/pim/productCore.js",
    destination: "pim_core_products",
    operations: ["update"],
    boundary: "authorizeUpdate",
    requireExplicitAuth: false,
    notes: "Identifier uniqueness runs before persist.",
  },
  {
    id: "productCatalogPim.createProduct",
    module: "server/lib/productCatalogPim.js",
    destination: "pim30_products",
    operations: ["create"],
    boundary: "authorizeCreate",
    requireExplicitAuth: true,
    notes: "No product-row updater. Translations/attributes/media/variants are related writes.",
  },
  {
    id: "pimCatalog.createProduct",
    module: "server/lib/pimCatalog.js",
    destination: "pim_products",
    operations: ["create"],
    boundary: "authorizeCreate",
    requireExplicitAuth: true,
  },
  {
    id: "pimCatalog.updateProduct",
    module: "server/lib/pimCatalog.js",
    destination: "pim_products",
    operations: ["update"],
    boundary: "authorizeUpdate",
    requireExplicitAuth: true,
  },
  {
    id: "catalogSeo.createProduct",
    module: "server/lib/catalogSeo.js",
    destination: "products",
    operations: ["create"],
    boundary: "authorizeCreate",
    requireExplicitAuth: true,
    notes: "Persists active=0. Table default active=1 must not silently publish.",
  },
  {
    id: "catalogSeo.updateProduct",
    module: "server/lib/catalogSeo.js",
    destination: "products",
    operations: ["update"],
    boundary: "authorizeUpdate",
    requireExplicitAuth: true,
  },
  {
    id: "productStore.upsertProduct",
    module: "server/lib/productStore.js",
    destination: "data/buzzard_products.json",
    operations: ["create", "update"],
    boundary: "authorizeCreate|authorizeUpdate",
    requireExplicitAuth: true,
  },
  {
    id: "productStore.deleteProduct",
    module: "server/lib/productStore.js",
    destination: "data/buzzard_products.json",
    operations: ["delete"],
    boundary: "authorizeDelete",
    requireExplicitAuth: true,
    notes: "No HTTP delete caller.",
  },
]);

const CLASSIFIED_NON_MASTER = Object.freeze([
  {
    id: "advancedSearch.createProduct",
    class: WRITER_CLASS.B_READ_MODEL,
    destination: "srch_products",
    module: "server/lib/advancedSearch.js",
    notes: "Search document. Not commercial identity. Not routed through productWriteBoundary.",
  },
  {
    id: "db.seed.products",
    class: WRITER_CLASS.C_SEED,
    destination: "products / pim_products / pim30_products / pim_core_products",
    module: "server/lib/db.js",
    notes: "Fixture inserts when tables are empty. Not a live authoring path.",
  },
  {
    id: "catalogProductSync.syncCatalogProducts",
    class: WRITER_CLASS.D_PROJECTION,
    destination: "products",
    module: "server/lib/catalogProductSync.js",
    notes: "Copies JSON catalog into products for storefront visibility. Not master authoring. Not dual-write to other stores.",
  },
  {
    id: "productCatalogPim.upsertTranslation",
    class: WRITER_CLASS.E_RELATED,
    destination: "pim30_product_translations",
    module: "server/lib/productCatalogPim.js",
    notes: "Locale copy. HTTP still requires admin.",
  },
  {
    id: "productCatalogPim.createVariant",
    class: WRITER_CLASS.E_RELATED,
    destination: "pim30_product_variants",
    module: "server/lib/productCatalogPim.js",
    notes: "Child SKU under an existing pim30 parent. Not a new master row.",
  },
]);

const READERS = Object.freeze([
  { id: "catalogReadService", module: "server/lib/storefront/catalogReadService.js", sources: ["pim_core_products", "visible PIM"] },
  { id: "storefrontBridgePlugin", module: "server/plugins/storefrontBridgePlugin.js", sources: ["catalogReadService"] },
  { id: "software.search", module: "server/lib/software/search.js", sources: ["catalogReadService"] },
  { id: "productStore.listProducts", module: "server/lib/productStore.js", sources: ["data/buzzard_products.json"] },
  { id: "catalogSeo.listProducts", module: "server/lib/catalogSeo.js", sources: ["products"] },
  { id: "pimCatalog.getProduct", module: "server/lib/pimCatalog.js", sources: ["pim_products"] },
  { id: "productCatalogPim.getProductBySku", module: "server/lib/productCatalogPim.js", sources: ["pim30_products"] },
  { id: "productCore.getProduct", module: "server/lib/pim/productCore.js", sources: ["pim_core_products"] },
  { id: "advancedSearch", module: "server/lib/advancedSearch.js", sources: ["srch_products"] },
  { id: "ordersPlugin", module: "server/plugins/ordersPlugin.js", sources: ["data/buzzard_products.json"] },
]);

const CANDIDATE_STORE = Object.freeze({
  table: "pim_core_products",
  writer: "productCore",
  selected: false,
  activated: false,
  reason:
    "Named by CANONICAL_ENGINES.productCreate, has identifier uniqueness and pim_core_product_audit. Not activated: other stores still have live readers, no identity map, migration unauthorized.",
});

function getProductArchitecture() {
  return {
    productSourceOfTruthActive: false,
    dualWrite: false,
    candidate: CANDIDATE_STORE,
    masterWriters: MASTER_WRITERS,
    classifiedNonMaster: CLASSIFIED_NON_MASTER,
    readers: READERS,
    stores: ["pim_core_products", "pim30_products", "pim_products", "products", "data/buzzard_products.json"],
  };
}

function activationStatus() {
  return {
    productSourceOfTruthActive: false,
    activated: false,
    dualWrite: false,
    candidate: CANDIDATE_STORE.table,
    humanApprovalRequired: true,
    productionMigration: false,
    envFlag: process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1",
    note: "SoT stays inactive in this slice. Activation is a separate human approval.",
  };
}

function assertNoDualWrite(result = {}) {
  if (result.dualWrite === true) {
    throw new Error("Dual-write is forbidden");
  }
  return true;
}

module.exports = {
  WRITER_CLASS,
  MASTER_WRITERS,
  CLASSIFIED_NON_MASTER,
  READERS,
  CANDIDATE_STORE,
  getProductArchitecture,
  activationStatus,
  assertNoDualWrite,
};
