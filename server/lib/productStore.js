const fs = require("fs");
const path = require("path");
const productWriteBoundary = require("./pim/productWriteBoundary");

const rootDir = path.join(__dirname, "..", "..");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");

function catalogFile() {
  return process.env.BUZZARD_PRODUCT_STORE_PATH || productsFile;
}

function readCatalog() {
  const file = catalogFile();
  if (!fs.existsSync(file)) {
    return { products: [], updated_at: new Date().toISOString() };
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return raw;
}

function writeCatalog(catalog) {
  catalog.updated_at = new Date().toISOString();
  fs.writeFileSync(catalogFile(), JSON.stringify(catalog, null, 2), "utf8");
}

function listProducts(filters = {}) {
  const catalog = readCatalog();
  let products = catalog.products || [];
  if (filters.supplierId) {
    products = products.filter((p) => p.supplier_id === filters.supplierId);
  }
  if (filters.status) {
    products = products.filter((p) => p.status === filters.status);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.ean_gtin || "").includes(q) ||
        (p.supplier_sku || "").toLowerCase().includes(q)
    );
  }
  return products;
}

function getProductById(id) {
  return listProducts().find((p) => p.id === id);
}

function findDuplicate({ supplierId, supplierSku, ean, excludeId }) {
  return listProducts().find((p) => {
    if (excludeId && p.id === excludeId) return false;
    if (supplierId && supplierSku && p.supplier_id === supplierId && p.supplier_sku === supplierSku) {
      return true;
    }
    if (ean && p.ean_gtin && p.ean_gtin === ean) return true;
    return false;
  });
}

function nextProductId() {
  const products = listProducts();
  const nums = products
    .map((p) => Number(String(p.id).replace("prod-", "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `prod-${String(next).padStart(6, "0")}`;
}

function upsertProduct(product = {}, context = {}) {
  const catalog = readCatalog();
  if (!Array.isArray(catalog.products)) catalog.products = [];
  const idx = catalog.products.findIndex((p) => p.id && product.id && p.id === product.id);
  const existing = idx >= 0 ? catalog.products[idx] : null;
  const gateContext = {
    source: context.source || "ADMIN",
    actorId: context.actorId || null,
    authorized: context.authorized === true,
    requireExplicitAuth: true,
    destination: "buzzard_products.json",
    existing: existing || undefined,
  };
  const gate = existing
    ? productWriteBoundary.authorizeUpdate(product, gateContext)
    : productWriteBoundary.authorizeCreate(product, gateContext);
  if (!gate.ok) {
    if (gate.reason === "SKU_REQUIRED") {
      return { error: "sku required", status: 400, reason: gate.reason, boundary: gate.boundary };
    }
    return { error: gate.message, status: gate.status, reason: gate.reason, boundary: gate.boundary };
  }
  if (
    gate.sku &&
    catalog.products.some((row) => row.sku === gate.sku && (!existing || row.id !== existing.id))
  ) {
    return { error: "SKU already exists", status: 409 };
  }

  const now = new Date().toISOString();
  const next = existing
    ? { ...existing, ...product, sku: gate.sku || existing.sku, updated_at: now }
    : {
        ...product,
        sku: gate.sku,
        status: product.status || "draft",
        created_at: product.created_at || now,
        updated_at: now,
      };
  if (idx >= 0) {
    catalog.products[idx] = next;
  } else {
    catalog.products.push(next);
  }
  writeCatalog(catalog);
  return next;
}

function deleteProduct(id, context = {}) {
  const catalog = readCatalog();
  if (!Array.isArray(catalog.products)) catalog.products = [];
  const existing = catalog.products.find((p) => p.id === id);
  if (!existing) return { error: "Product not found", status: 404 };
  const gate = productWriteBoundary.authorizeDelete(existing, {
    source: context.source || "ADMIN",
    actorId: context.actorId || null,
    authorized: context.authorized === true,
    requireExplicitAuth: true,
    destination: "buzzard_products.json",
    existing,
  });
  if (!gate.ok) {
    return { error: gate.message, status: gate.status, reason: gate.reason, boundary: gate.boundary };
  }
  catalog.products = catalog.products.filter((p) => p.id !== id);
  writeCatalog(catalog);
  return { deleted: true, id, dualWrite: false, productSourceOfTruthActive: false };
}

module.exports = {
  readCatalog,
  listProducts,
  getProductById,
  findDuplicate,
  nextProductId,
  upsertProduct,
  deleteProduct,
};
