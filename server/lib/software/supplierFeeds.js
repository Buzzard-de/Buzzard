/**
 * Supplier feed parse/validate/dry-run. Wraps existing adapters and parsers.
 * Never opens a live supplier connection or sends a purchase order.
 */

const crypto = require("crypto");
const { XMLParser } = require("fast-xml-parser");
const { validateEan } = require("../productValidator");
const { CsvSupplierAdapter } = require("../supplier/csvSupplierAdapter");
const { XmlSupplierAdapter } = require("../supplier/xmlSupplierAdapter");

const FEED_STATUS = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  CONFIGURED: "CONFIGURED",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  CONNECTED: "CONNECTED",
  FEED_AVAILABLE: "FEED_AVAILABLE",
  FEED_VALIDATED: "FEED_VALIDATED",
  IMPORT_READY: "IMPORT_READY",
  BLOCKED: "BLOCKED",
  ERROR: "ERROR",
});

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function parseCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] == null ? "" : cells[index];
    });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function parseXml(payload) {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  const parsed = parser.parse(String(payload || ""));
  const list = parsed?.products?.product ?? parsed?.catalog?.product ?? parsed?.feed?.item ?? [];
  return Array.isArray(list) ? list : [list].filter(Boolean);
}

function parseJson(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return payload.products || payload.items || [];
  const parsed = JSON.parse(String(payload || "[]"));
  return Array.isArray(parsed) ? parsed : parsed.products || parsed.items || [];
}

function normalizeRow(raw, index) {
  const sku = String(raw.supplier_sku || raw.sku || raw.supplierSku || "").trim();
  const gtin = String(raw.ean_gtin || raw.gtin || raw.ean || "").replace(/\D/g, "");
  const price = Number(raw.supplier_price?.amount ?? raw.price ?? raw.amount);
  const currency = String(raw.supplier_price?.currency || raw.currency || "EUR").trim().toUpperCase();
  const stock = raw.stock == null && raw.quantity == null ? null : Number(raw.stock ?? raw.quantity);
  const timestamp = raw.timestamp || raw.updated_at || raw.lastSupplierUpdate || raw.stock_updated_at || null;
  return {
    index,
    sku,
    gtin: gtin || null,
    title: String(raw.name || raw.title || "").trim(),
    brand: raw.brand || null,
    category: raw.supplier_category || raw.category || null,
    price: Number.isFinite(price) ? price : null,
    currency,
    stock: Number.isFinite(stock) ? stock : null,
    timestamp,
  };
}

function validateRow(row) {
  const errors = [];
  const warnings = [];
  if (!row.sku) errors.push("SKU_REQUIRED");
  if (row.price == null) errors.push("PRICE_REQUIRED");
  else if (row.price < 0) errors.push("PRICE_INVALID");
  if (!/^[A-Z]{3}$/.test(row.currency || "")) errors.push("CURRENCY_INVALID");
  if (row.stock == null) warnings.push("STOCK_MISSING");
  else if (!Number.isFinite(row.stock) || row.stock < 0) errors.push("STOCK_INVALID");
  if (row.gtin) {
    const ean = validateEan(row.gtin);
    if (!ean.ok) errors.push(ean.error || "GTIN_INVALID");
  } else {
    warnings.push("GTIN_MISSING");
  }
  if (row.timestamp) {
    const parsed = Date.parse(row.timestamp);
    if (Number.isNaN(parsed)) errors.push("TIMESTAMP_INVALID");
  } else {
    warnings.push("TIMESTAMP_MISSING");
  }
  if (!row.category) warnings.push("CATEGORY_UNMAPPED");
  return { errors, warnings };
}

function detectDuplicates(rows) {
  const skuSeen = new Map();
  const gtinSeen = new Map();
  const duplicates = [];
  rows.forEach((row) => {
    if (row.sku) {
      if (skuSeen.has(row.sku)) duplicates.push({ field: "sku", value: row.sku, indexes: [skuSeen.get(row.sku), row.index] });
      else skuSeen.set(row.sku, row.index);
    }
    if (row.gtin) {
      if (gtinSeen.has(row.gtin)) duplicates.push({ field: "gtin", value: row.gtin, indexes: [gtinSeen.get(row.gtin), row.index] });
      else gtinSeen.set(row.gtin, row.index);
    }
  });
  return duplicates;
}

function classifyStatus({ configured, parsed, errors, live }) {
  if (live) return FEED_STATUS.BLOCKED;
  if (!configured) return FEED_STATUS.NOT_CONFIGURED;
  if (errors.length && !parsed) return FEED_STATUS.ERROR;
  if (errors.length) return FEED_STATUS.FEED_AVAILABLE;
  if (parsed) return FEED_STATUS.FEED_VALIDATED;
  return FEED_STATUS.CONFIGURED;
}

function rejectLiveFetch(url) {
  return {
    ok: false,
    status: FEED_STATUS.BLOCKED,
    written: false,
    live: false,
    importReady: false,
    purchaseOrderSent: false,
    urlRejected: true,
    reason: "LIVE_FETCH_BLOCKED",
    note: "Supplier feeds accept local payloads only. Network fetch and purchase-order send stay BLOCKED.",
    target: typeof url === "string" ? url.slice(0, 80) : null,
  };
}

function preview({ format, payload, supplierId = "fixture", credentialsConfigured = false, url } = {}) {
  if (url) {
    return rejectLiveFetch(url);
  }
  const kind = String(format || "").toLowerCase();
  let rawRows = [];
  try {
    if (kind === "csv") rawRows = parseCsv(payload);
    else if (kind === "xml") rawRows = parseXml(payload);
    else if (kind === "json") rawRows = parseJson(payload);
    else {
      return {
        ok: false,
        status: FEED_STATUS.ERROR,
        written: false,
        live: false,
        purchaseOrderSent: false,
        errors: ["UNSUPPORTED_FORMAT"],
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: FEED_STATUS.ERROR,
      written: false,
      live: false,
      purchaseOrderSent: false,
      errors: ["PARSE_FAILED"],
      detail: error.message,
    };
  }

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index));
  const validated = rows.map((row) => ({ ...row, ...validateRow(row) }));
  const duplicates = detectDuplicates(rows);
  const rowErrors = validated.flatMap((row) => row.errors.map((code) => ({ index: row.index, sku: row.sku, code })));
  const status = classifyStatus({
    configured: credentialsConfigured,
    parsed: rows.length > 0,
    errors: rowErrors,
    live: false,
  });

  return {
    ok: rowErrors.length === 0 && duplicates.length === 0,
    status,
    format: kind,
    supplierId,
    written: false,
    live: false,
    importReady: false,
    purchaseOrderSent: false,
    credentialsConfigured: Boolean(credentialsConfigured),
    version: newId("feed"),
    rowCount: rows.length,
    rows: validated,
    duplicates,
    errors: rowErrors,
    note: "Dry-run feed preview. Catalog is not written. Live supplier fetch remains BLOCKED.",
  };
}

function adapterStatus(format) {
  const Adapter = format === "xml" ? XmlSupplierAdapter : CsvSupplierAdapter;
  const adapter = new Adapter({ credentialsConfigured: false });
  const config = adapter.validateConfiguration();
  return {
    format,
    status: config.credentialsConfigured ? FEED_STATUS.CONFIGURED : FEED_STATUS.NOT_CONFIGURED,
    live: false,
    networkBlocked: true,
    canGoLive: false,
    issues: config.issues,
  };
}

function recordPreview(db, previewResult) {
  if (!db) return previewResult;
  db.prepare(
    `INSERT INTO software_audit(id, kind, subject, details_json) VALUES(?,?,?,?)`
  ).run(
    newId("saud"),
    "supplier_feed_preview",
    previewResult.supplierId || "fixture",
    JSON.stringify({
      status: previewResult.status,
      format: previewResult.format,
      rowCount: previewResult.rowCount,
      written: false,
      live: false,
      errors: previewResult.errors?.length || 0,
    })
  );
  return previewResult;
}

module.exports = {
  FEED_STATUS,
  parseCsv,
  parseXml,
  parseJson,
  preview,
  adapterStatus,
  recordPreview,
  rejectLiveFetch,
};
