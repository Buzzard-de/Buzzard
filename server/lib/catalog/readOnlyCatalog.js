const { canonicalizeCatalogPath, refusal } = require("./catalogPath");

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

function openReadOnlyCatalog({ dbPath } = {}) {
  if (!dbPath) throw refusal("DATA_PATH_REFUSED");
  const canonical = canonicalizeCatalogPath(dbPath, { allowMissing: false });
  const fs = require("fs");
  if (!fs.existsSync(canonical)) throw refusal("DATABASE_FILE_REQUIRED");
  const Database = require("better-sqlite3");
  let handle;
  try {
    handle = new Database(canonical, { readonly: true, fileMustExist: true });
    handle.pragma("query_only = ON");
    const flag = handle.pragma("query_only", { simple: true });
    if (Number(flag) !== 1) throw refusal("CATALOG_READ_ONLY_UNAVAILABLE");
  } catch (err) {
    if (handle) {
      try { handle.close(); } catch { /* leave no open catalog connection */ }
    }
    throw err;
  }

  function selectAll(sql, params = []) {
    if (isWriteSql(sql) || FORBIDDEN.test(sql)) throw refusal(isWriteSql(sql) ? "CATALOG_READ_ONLY" : "CATALOG_SCOPE_REFUSED");
    return handle.prepare(sql).all(...params);
  }

  function selectOne(sql, params = []) {
    const rows = selectAll(sql, params);
    return rows[0] || null;
  }

  function getProduct(key) {
    if (!key) return null;
    return selectOne(
      `SELECT id, sku, title, status, visibility, category_id, brand_id
       FROM catalog_products
       WHERE id = ? OR sku = ?`,
      [key, key],
    );
  }

  const session = {
    path: canonical,
    mode: "READ_ONLY",
    capabilities: Object.freeze({
      write: false,
      sales: false,
      egress: false,
      productionReady: false,
    }),
    listTables() {
      return selectAll("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map((row) => row.name);
    },
    listCategories() {
      return selectAll("SELECT id, name, slug FROM catalog_categories ORDER BY name");
    },
    listBrands() {
      return selectAll("SELECT id, name, slug FROM catalog_brands ORDER BY name");
    },
    getProduct,
    listIdentifiers(productId) {
      return selectAll(
        "SELECT id, product_id, kind, value FROM catalog_identifiers WHERE product_id = ? ORDER BY kind",
        [productId],
      );
    },
    listVariants(productId) {
      return selectAll(
        "SELECT id, product_id, sku, axis, value FROM catalog_variants WHERE product_id = ? ORDER BY sku",
        [productId],
      );
    },
    listMedia(productId) {
      return selectAll(
        "SELECT id, product_id, media_type, label, sort_order FROM catalog_media WHERE product_id = ? ORDER BY sort_order",
        [productId],
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
      if (FORBIDDEN.test(sql)) throw refusal("CATALOG_SCOPE_REFUSED");
      if (!/^\s*select\b/i.test(String(sql))) throw refusal("CATALOG_READ_ONLY");
      return selectAll(sql, params);
    },
    queryOnly() {
      return Number(handle.pragma("query_only", { simple: true })) === 1;
    },
    close() {
      handle.close();
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
