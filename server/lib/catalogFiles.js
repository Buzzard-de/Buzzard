/**
 * Catalog files the API changes while it runs.
 *
 * Suppliers, supplier category mappings, the product catalog, SEO overrides
 * and category visibility are JSON files in the repository's data/ directory
 * that admin actions, imports and the start-up sync rewrite. A test run or an
 * isolated stack must not rewrite the files of the checkout, so they get a
 * working copy:
 *
 *   BUZZARD_CATALOG_DIR set   the copy lives there (created from data/ when missing)
 *   automated test process    a private temporary copy, fresh for every process
 *   otherwise                 data/ itself, as before
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoCatalogDir = path.join(__dirname, "..", "..", "data");
const RUNTIME_CATALOG_FILES = Object.freeze([
  "buzzard_suppliers.json",
  "buzzard_supplier_category_mappings.json",
  "buzzard_products.json",
  "buzzard_seo_overrides.json",
  "buzzard_category_visibility.json",
]);
// Survives a reload of this module within one process, so that a copy is not replaced halfway through a test.
const SEEDED = Symbol.for("buzzard.catalogFiles.seeded");

function isAutomatedTestProcess() {
  if (process.env.VITEST === "true") return true;
  const args = [...process.execArgv, ...process.argv];
  if (args.includes("--test")) return true;
  return process.argv.some((arg) => /(?:^|[\\/])__tests__[\\/].+\.test\.mjs$/.test(arg));
}

function getRuntimeCatalogInfo() {
  const configured = String(process.env.BUZZARD_CATALOG_DIR || "").trim();
  if (configured) return { dir: path.resolve(configured), mode: "custom_path" };
  if (isAutomatedTestProcess()) {
    const worker = process.env.VITEST_POOL_ID || process.env.VITEST_WORKER_ID || "0";
    return { dir: path.join(os.tmpdir(), "buzzard-test-catalog", `worker-${worker}-${process.pid}`), mode: "test_isolated" };
  }
  return { dir: repoCatalogDir, mode: "repository" };
}

function copyInto(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  fs.copyFileSync(source, temporary);
  fs.renameSync(temporary, target);
}

/** Path of a catalog file the API may rewrite. */
function runtimeCatalogFile(name) {
  if (!RUNTIME_CATALOG_FILES.includes(name)) {
    throw new Error(`not a runtime catalog file: ${name}`);
  }
  const { dir, mode } = getRuntimeCatalogInfo();
  const source = path.join(repoCatalogDir, name);
  if (path.resolve(dir) === path.resolve(repoCatalogDir)) return source;
  const target = path.join(dir, name);
  const seeded = (process[SEEDED] = process[SEEDED] || new Set());
  const stale = mode === "test_isolated" && !seeded.has(target);
  if ((stale || !fs.existsSync(target)) && fs.existsSync(source)) {
    copyInto(source, target);
  }
  seeded.add(target);
  return target;
}

module.exports = { repoCatalogDir, RUNTIME_CATALOG_FILES, getRuntimeCatalogInfo, runtimeCatalogFile };
