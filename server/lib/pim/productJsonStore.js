const fs = require("fs");
const path = require("path");

function resolveProductStorePath() {
  const selected = process.env.BUZZARD_PRODUCT_STORE_PATH;
  if (!selected) return { enabled: false, written: false };
  const file = path.resolve(selected);
  const protectedDirs = [path.resolve(__dirname, "../../data"), path.resolve(__dirname, "../../../data")];
  if (protectedDirs.some((dir) => file === dir || file.startsWith(`${dir}${path.sep}`))) {
    return { enabled: false, written: false, code: "PRODUCT_STORE_PATH_PROTECTED" };
  }
  return { enabled: true, file };
}

function readStore() {
  const target = resolveProductStorePath();
  if (!target.enabled) return { ...target, products: [] };
  if (!fs.existsSync(target.file)) return { ...target, products: [] };
  const parsed = JSON.parse(fs.readFileSync(target.file, "utf8"));
  const products = Array.isArray(parsed) ? parsed : parsed.products || [];
  return { ...target, products };
}

function writeProduct(product) {
  const target = resolveProductStorePath();
  if (!target.enabled) return { ...target, written: false };
  const current = readStore();
  const products = current.products.filter((row) => row.sku !== product.sku);
  products.push({ sku: product.sku, title: product.title || product.sku, active: 0 });
  fs.mkdirSync(path.dirname(target.file), { recursive: true });
  fs.writeFileSync(target.file, JSON.stringify({ products }, null, 2));
  return { enabled: true, written: true, file: target.file, count: products.length };
}

module.exports = { resolveProductStorePath, readStore, writeProduct };
