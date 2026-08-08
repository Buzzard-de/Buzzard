const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");

function readCatalog() {
  const raw = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  return raw;
}

function writeCatalog(catalog) {
  catalog.updated_at = new Date().toISOString();
  fs.writeFileSync(productsFile, JSON.stringify(catalog, null, 2), "utf8");
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

function upsertProduct(product) {
  const catalog = readCatalog();
  const idx = catalog.products.findIndex((p) => p.id === product.id);
  const now = new Date().toISOString();
  const next = { ...product, updated_at: now };
  if (idx >= 0) {
    catalog.products[idx] = { ...catalog.products[idx], ...next };
  } else {
    next.created_at = next.created_at || now;
    catalog.products.push(next);
  }
  writeCatalog(catalog);
  return next;
}

function deleteProduct(id) {
  const catalog = readCatalog();
  catalog.products = catalog.products.filter((p) => p.id !== id);
  writeCatalog(catalog);
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
