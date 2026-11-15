const crypto = require("crypto");
const fs = require("fs");
const { canonicalizeCatalogPath, refusal: codedRefusal } = require("./catalogPath");

function refusal(code) {
  const error = codedRefusal(code);
  error.stack = undefined;
  return error;
}

const LIST_LIMITS = Object.freeze({
  tables: 32,
  categories: 200,
  brands: 200,
  identifiers: 100,
  variants: 100,
  media: 100,
});

const ALLOWED_READS = new Map([
  [
    "SELECTID,SKU,TITLE,STATUS,VISIBILITYFROMCATALOG_PRODUCTSWHEREID=?",
    "SELECT id, sku, title, status, visibility FROM catalog_products WHERE id = ? LIMIT 2",
  ],
  [
    "SELECTID,SKU,TITLE,STATUS,VISIBILITYFROMCATALOG_PRODUCTSWHERESKU=?",
    "SELECT id, sku, title, status, visibility FROM catalog_products WHERE sku = ? LIMIT 2",
  ],
]);

function compactSql(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .replace(/'(?:''|[^'])*'/g, "")
    .replace(/"(?:[^"]|"")*"/g, "")
    .replace(/`(?:``|[^`])*`/g, "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

function matchAllowedRead(sql) {
  const compact = compactSql(sql);
  if (compact.includes(";") || compact.includes("PRICE") || compact.includes("STOCK")) return null;
  return ALLOWED_READS.get(compact) || null;
}

const sessions = new WeakSet();

const FORBIDDEN = /\b(?:commerce_orders|commerce_carts|commerce_checkouts|users|customers|payments|payment_intents|inventory_sot_reservations|supplier_credentials|commerce_idempotency|core_scheduled_jobs|core_background_jobs|core_worker_state)\b/i;

function isWriteSql(sql) {
  const stripped = String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
  return /\b(?:insert|update|delete|alter|drop|create|replace|attach|detach|reindex|vacuum|analyze)\b/i.test(stripped)
    || /\bbegin\s+(?:immediate|exclusive)\b/i.test(stripped)
    || /\bpragma\s+[A-Za-z_][A-Za-z0-9_]*\s*=/i.test(stripped);
}

function describeFd(fd) {
  const first = fs.fstatSync(fd);
  if (!first.isFile()) throw refusal("CATALOG_INTEGRITY_FAILED");
  const bytes = Buffer.alloc(first.size);
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
    if (count <= 0) throw refusal("CATALOG_INTEGRITY_FAILED");
    offset += count;
  }
  const second = fs.fstatSync(fd);
  if (
    second.dev !== first.dev
    || second.ino !== first.ino
    || second.size !== first.size
    || Math.trunc(second.mtimeMs) !== Math.trunc(first.mtimeMs)
  ) {
    throw refusal("CATALOG_INTEGRITY_FAILED");
  }
  return {
    dev: second.dev,
    ino: second.ino,
    size: second.size,
    mtimeMs: second.mtimeMs,
    mtimeTrunc: Math.trunc(second.mtimeMs),
    hash: crypto.createHash("sha256").update(bytes).digest("hex"),
    bytes,
  };
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeTrunc === right.mtimeTrunc
    && left.hash === right.hash;
}

function assertPathMatches(baseline) {
  let listed;
  try {
    listed = fs.lstatSync(baseline.path);
  } catch {
    throw refusal("CATALOG_INTEGRITY_FAILED");
  }
  if (!listed.isFile() || listed.isSymbolicLink()) throw refusal("CATALOG_INTEGRITY_FAILED");
  let real;
  try {
    real = fs.realpathSync(baseline.path);
  } catch {
    throw refusal("CATALOG_INTEGRITY_FAILED");
  }
  if (real !== baseline.path) throw refusal("CATALOG_INTEGRITY_FAILED");
  const stat = fs.statSync(real);
  if (stat.dev !== baseline.dev || stat.ino !== baseline.ino || stat.size !== baseline.size || Math.trunc(stat.mtimeMs) !== baseline.mtimeTrunc) {
    throw refusal("CATALOG_INTEGRITY_FAILED");
  }
}

function openReadOnlyCatalog({ dbPath, integrityProbe } = {}) {
  if (!dbPath) throw refusal("DATA_PATH_REFUSED");
  const canonical = canonicalizeCatalogPath(dbPath, { allowMissing: false });
  if (!fs.existsSync(canonical)) throw refusal("DATABASE_FILE_REQUIRED");
  const probe = typeof integrityProbe === "function" ? integrityProbe : null;
  const Database = require("better-sqlite3");
  const fd = fs.openSync(canonical, fs.constants.O_RDONLY);
  let handle;
  let memory;
  let baseline;
  try {
    const opened = describeFd(fd);
    assertPathMatches({ ...opened, path: canonical });
    handle = new Database(canonical, { readonly: true, fileMustExist: true });
    handle.pragma("query_only = ON");
    if (Number(handle.pragma("query_only", { simple: true })) !== 1) throw refusal("CATALOG_READ_ONLY_UNAVAILABLE");
    const confirmed = describeFd(fd);
    if (!sameIdentity(opened, confirmed)) throw refusal("CATALOG_INTEGRITY_FAILED");
    memory = new Database(opened.bytes);
    memory.pragma("query_only = ON");
    if (Number(memory.pragma("query_only", { simple: true })) !== 1) throw refusal("CATALOG_READ_ONLY_UNAVAILABLE");
    const settled = describeFd(fd);
    if (!sameIdentity(opened, settled)) throw refusal("CATALOG_INTEGRITY_FAILED");
    baseline = {
      path: canonical,
      dev: opened.dev,
      ino: opened.ino,
      size: opened.size,
      mtimeMs: opened.mtimeMs,
      mtimeTrunc: opened.mtimeTrunc,
      hash: opened.hash,
    };
  } catch (err) {
    try { if (memory) memory.close(); } catch { /* drop the unused snapshot */ }
    try { if (handle) handle.close(); } catch { /* drop the unused file connection */ }
    try { fs.closeSync(fd); } catch { /* the descriptor could not be closed */ }
    throw err;
  }

  let closed = false;

  function assertIntact() {
    if (closed) throw refusal("CATALOG_CONNECTION_REQUIRED");
    assertPathMatches(baseline);
    const current = describeFd(fd);
    if (!sameIdentity(baseline, current)) throw refusal("CATALOG_INTEGRITY_FAILED");
  }

  function selectAll(sql, params = []) {
    if (isWriteSql(sql) || FORBIDDEN.test(sql)) throw refusal(isWriteSql(sql) ? "CATALOG_READ_ONLY" : "CATALOG_SCOPE_REFUSED");
    assertIntact();
    if (probe) probe("before-query");
    let rows;
    try {
      rows = memory.prepare(sql).all(...params);
    } catch (error) {
      try { assertIntact(); } catch (integrityError) { throw integrityError; }
      if (error && typeof error.code === "string" && (error.code.startsWith("CATALOG_") || error.code === "DATA_PATH_REFUSED" || error.code === "DATABASE_FILE_REQUIRED")) {
        throw error;
      }
      throw refusal("REQUEST_REFUSED");
    }
    if (probe) probe("after-query");
    assertIntact();
    return rows;
  }

  function bounded(sql, params, limit) {
    const rows = selectAll(`${sql} LIMIT ?`, [...params, limit + 1]);
    if (rows.length > limit) throw refusal("CATALOG_RESULT_LIMIT");
    return rows;
  }

  function exactlyOne(sql, value) {
    const rows = selectAll(sql, [value]);
    if (rows.length > 1) throw refusal("CATALOG_KEY_AMBIGUOUS");
    return rows[0] || null;
  }

  function getProduct(key) {
    if (!key) return null;
    const columns = "id, sku, title, status, visibility, category_id, brand_id";
    const byId = exactlyOne(`SELECT ${columns} FROM catalog_products WHERE id = ?`, key);
    if (byId) return byId;
    return exactlyOne(`SELECT ${columns} FROM catalog_products WHERE sku = ?`, key);
  }

  const session = {
    get path() {
      if (closed) throw refusal("CATALOG_CONNECTION_REQUIRED");
      return canonical;
    },
    mode: "READ_ONLY",
    capabilities: Object.freeze({
      write: false,
      sales: false,
      egress: false,
      productionReady: false,
    }),
    identity() {
      if (closed) throw refusal("CATALOG_CONNECTION_REQUIRED");
      return Object.freeze({
        path: baseline.path,
        dev: baseline.dev,
        ino: baseline.ino,
        size: baseline.size,
        mtimeMs: baseline.mtimeMs,
        sha256: baseline.hash,
      });
    },
    listTables() {
      return bounded(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        [],
        LIST_LIMITS.tables,
      ).map((row) => row.name);
    },
    listCategories() {
      return bounded("SELECT id, name, slug FROM catalog_categories ORDER BY name", [], LIST_LIMITS.categories);
    },
    listBrands() {
      return bounded("SELECT id, name, slug FROM catalog_brands ORDER BY name", [], LIST_LIMITS.brands);
    },
    getProduct,
    listIdentifiers(productId) {
      return bounded(
        "SELECT id, product_id, kind, value FROM catalog_identifiers WHERE product_id = ? ORDER BY kind",
        [productId],
        LIST_LIMITS.identifiers,
      );
    },
    listVariants(productId) {
      return bounded(
        "SELECT id, product_id, sku, axis, value FROM catalog_variants WHERE product_id = ? ORDER BY sku",
        [productId],
        LIST_LIMITS.variants,
      );
    },
    listMedia(productId) {
      return bounded(
        "SELECT id, product_id, media_type, label, sort_order FROM catalog_media WHERE product_id = ? ORDER BY sort_order",
        [productId],
        LIST_LIMITS.media,
      );
    },
    readProductForPusat(key) {
      const product = getProduct(key);
      if (!product) return null;
      return {
        id: product.id,
        sku: product.sku,
        title: product.title,
        status: product.status,
        visibility: product.visibility,
        stock: null,
        price: null,
        commercialValuesStored: false,
      };
    },
    readSql(sql, params = []) {
      if (isWriteSql(sql)) throw refusal("CATALOG_READ_ONLY");
      const canonical = matchAllowedRead(sql);
      if (!canonical || !Array.isArray(params) || params.length !== 1) throw refusal("CATALOG_SCOPE_REFUSED");
      const rows = selectAll(canonical, params);
      if (rows.length > 1) throw refusal("CATALOG_KEY_AMBIGUOUS");
      return rows;
    },
    queryOnly() {
      assertIntact();
      return Number(memory.pragma("query_only", { simple: true })) === 1;
    },
    close() {
      if (closed) return;
      closed = true;
      try { memory.close(); } catch { /* the snapshot is already closed */ }
      try { handle.close(); } catch { /* the file connection is already closed */ }
      try { fs.closeSync(fd); } catch { /* the descriptor is already closed */ }
    },
  };
  Object.freeze(session);
  sessions.add(session);
  return session;
}

function isCatalogSession(catalog) {
  return sessions.has(catalog);
}

module.exports = {
  openReadOnlyCatalog,
  isCatalogSession,
};
