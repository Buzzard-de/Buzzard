const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const suppliersFile = path.join(rootDir, "data", "buzzard_suppliers.json");
const mappingsFile = path.join(rootDir, "data", "buzzard_supplier_category_mappings.json");
const secretsFile = path.join(__dirname, "..", "data", "supplier-secrets.json");

function readSuppliersDoc() {
  return JSON.parse(fs.readFileSync(suppliersFile, "utf8"));
}

function writeSuppliersDoc(doc) {
  fs.writeFileSync(suppliersFile, JSON.stringify(doc, null, 2), "utf8");
}

function listSuppliers() {
  return readSuppliersDoc().suppliers || [];
}

function getSupplier(id) {
  return listSuppliers().find((s) => s.supplier_id === id);
}

function upsertSupplier(supplier) {
  const doc = readSuppliersDoc();
  const idx = doc.suppliers.findIndex((s) => s.supplier_id === supplier.supplier_id);
  if (idx >= 0) doc.suppliers[idx] = { ...doc.suppliers[idx], ...supplier };
  else doc.suppliers.push(supplier);
  writeSuppliersDoc(doc);
  return supplier;
}

function readMappings() {
  return JSON.parse(fs.readFileSync(mappingsFile, "utf8")).mappings || [];
}

function writeMappings(mappings) {
  const doc = JSON.parse(fs.readFileSync(mappingsFile, "utf8"));
  doc.mappings = mappings;
  fs.writeFileSync(mappingsFile, JSON.stringify(doc, null, 2), "utf8");
}

function mapSupplierCategory(supplierId, supplierCategory) {
  const normalized = String(supplierCategory || "").trim().toLowerCase();
  const mapping = readMappings().find(
    (m) =>
      m.active &&
      m.supplier_id === supplierId &&
      m.supplier_category.toLowerCase() === normalized
  );
  return mapping?.buzzard_category_id || null;
}

function getSecrets() {
  if (!fs.existsSync(secretsFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(secretsFile, "utf8"));
  } catch {
    return {};
  }
}

function setSupplierSecret(supplierId, secret) {
  const secrets = getSecrets();
  secrets[supplierId] = secret;
  const dir = path.dirname(secretsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), "utf8");
}

function toAdminSupplier(supplier) {
  return { ...supplier, has_api_secret: Boolean(getSecrets()[supplier.supplier_id]) };
}

module.exports = {
  listSuppliers,
  getSupplier,
  upsertSupplier,
  readMappings,
  writeMappings,
  mapSupplierCategory,
  getSecrets,
  setSupplierSecret,
  toAdminSupplier,
};
