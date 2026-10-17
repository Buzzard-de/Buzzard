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
    supplierCost: Number.isFinite(Number(raw.supplier_cost ?? raw.cost ?? raw.supplierCost))
      ? Number(raw.supplier_cost ?? raw.cost ?? raw.supplierCost)
      : null,
    currency,
    stock: Number.isFinite(stock) ? stock : null,
    timestamp,
    sourceId: raw.source_id || raw.sourceId || raw.external_id || raw.supplier_item_id || null,
    packQty: Number.isFinite(Number(raw.pack_qty ?? raw.packQty)) ? Number(raw.pack_qty ?? raw.packQty) : 1,
    live: false,
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
    else if (parsed > Date.now() + 60_000) errors.push("TIMESTAMP_FUTURE");
  } else {
    warnings.push("TIMESTAMP_MISSING");
  }
  if (!row.category) warnings.push("CATEGORY_UNMAPPED");
  if (row.packQty != null && (!Number.isFinite(Number(row.packQty)) || Number(row.packQty) <= 0)) {
    errors.push("PACK_QTY_INVALID");
  }
  const cost = Number(row.supplierCost ?? row.cost);
  if (row.supplierCost != null || row.cost != null) {
    if (!Number.isFinite(cost) || cost <= 0) errors.push("SUPPLIER_COST_INVALID");
  }
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

function detectSourceIdConflicts(rows) {
  const seen = new Map();
  const conflicts = [];
  rows.forEach((row) => {
    if (!row.sourceId) return;
    const key = String(row.sourceId);
    if (seen.has(key) && seen.get(key) !== row.sku) {
      conflicts.push({ field: "sourceId", value: key, skus: [seen.get(key), row.sku] });
    } else if (!seen.has(key)) {
      seen.set(key, row.sku);
    }
  });
  return conflicts;
}

function classifyStatus({ configured, parsed, errors, live }) {
  if (live) return FEED_STATUS.BLOCKED;
  if (!configured) return FEED_STATUS.NOT_CONFIGURED;
  if (errors.length && !parsed) return FEED_STATUS.ERROR;
  if (errors.length) return FEED_STATUS.FEED_AVAILABLE;
  if (parsed) return FEED_STATUS.FEED_VALIDATED;
  return FEED_STATUS.CONFIGURED;
}

const feedFailures = new Map();

function recordCircuit(supplierId, ok) {
  const id = String(supplierId || "fixture");
  if (ok) {
    feedFailures.delete(id);
    return { open: false, failures: 0 };
  }
  const next = (feedFailures.get(id) || 0) + 1;
  feedFailures.set(id, next);
  return { open: next >= 3, failures: next };
}

function circuitStatus(supplierId) {
  const failures = feedFailures.get(String(supplierId || "fixture")) || 0;
  return { open: failures >= 3, failures };
}

function resetCircuit(supplierId) {
  if (supplierId) feedFailures.delete(String(supplierId));
  else feedFailures.clear();
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
  const circuit = circuitStatus(supplierId);
  if (circuit.open) {
    return {
      ok: false,
      status: FEED_STATUS.BLOCKED,
      written: false,
      live: false,
      importReady: false,
      purchaseOrderSent: false,
      reason: "CIRCUIT_OPEN",
      failures: circuit.failures,
      note: "Local circuit is open after repeated feed errors. No live fetch is attempted.",
    };
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
      detail: require("../security").publicTaskError(error, "PARSE_FAILED"),
    };
  }

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index));
  const validated = rows.map((row) => ({ ...row, ...validateRow(row) }));
  const duplicates = detectDuplicates(rows);
  const sourceIdConflicts = detectSourceIdConflicts(rows);
  const rowErrors = validated.flatMap((row) => row.errors.map((code) => ({ index: row.index, sku: row.sku, code })));
  const status = classifyStatus({
    configured: credentialsConfigured,
    parsed: rows.length > 0,
    errors: rowErrors,
    live: false,
  });

  const ok = rowErrors.length === 0 && duplicates.length === 0 && sourceIdConflicts.length === 0;
  const breaker = recordCircuit(supplierId, ok);
  return {
    ok,
    status: breaker.open ? FEED_STATUS.BLOCKED : status,
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
    sourceIdConflicts,
    errors: rowErrors,
    circuit: breaker,
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

const previewCache = new Map();

function previewIdempotent(input = {}) {
  const key = input.idempotencyKey ? String(input.idempotencyKey).trim() : "";
  const hash = crypto.createHash("sha256").update(JSON.stringify({
    format: input.format || null,
    payload: input.payload || null,
    supplierId: input.supplierId || null,
  })).digest("hex");
  if (key && previewCache.has(key)) {
    const prior = previewCache.get(key);
    if (prior.hash !== hash) {
      return {
        ok: false,
        status: FEED_STATUS.ERROR,
        written: false,
        live: false,
        importReady: false,
        purchaseOrderSent: false,
        code: "IDEMPOTENCY_CONFLICT",
        replayed: false,
      };
    }
    return { ...prior.result, replayed: true, written: false, live: false, purchaseOrderSent: false };
  }
  const result = preview(input);
  if (key) previewCache.set(key, { hash, result });
  return { ...result, replayed: false };
}

function resetPreviewIdempotency() {
  previewCache.clear();
}

const AVAILABILITY = Object.freeze({
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  UNKNOWN: "UNKNOWN",
  STALE: "STALE",
  OUTAGE: "OUTAGE",
  MALFORMED: "MALFORMED",
});

function classifyOutage(input = {}) {
  const status = Number(input.status || input.statusCode || 0);
  const code = String(input.code || input.errorCode || "").toUpperCase();
  const kind = String(input.kind || input.failureKind || "").toLowerCase();
  const outage =
    input.outage === true ||
    input.timeout === true ||
    kind === "timeout" ||
    kind === "network" ||
    status >= 500 ||
    status === 408 ||
    status === 429 ||
    /ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/.test(code);
  const malformed = input.malformed === true || kind === "malformed" || status === 400;
  if (outage) {
    return {
      ok: true,
      availability: AVAILABILITY.OUTAGE,
      treatAsStock: false,
      purchasable: false,
      live: false,
      reason: "SUPPLIER_OUTAGE",
      note: "Supplier outage is not inventory. Quantity is not inferred.",
    };
  }
  if (malformed) {
    return {
      ok: true,
      availability: AVAILABILITY.MALFORMED,
      treatAsStock: false,
      purchasable: false,
      live: false,
      reason: "SUPPLIER_PAYLOAD_MALFORMED",
    };
  }
  return { ok: true, outage: false, malformed: false, live: false };
}

function classifyAvailability(row = {}, context = {}) {
  const outage = classifyOutage(context);
  if (outage.treatAsStock === false) {
    return { ...outage, sku: row.sku || null, stock: null, live: false };
  }
  if (row.stock == null || !Number.isFinite(Number(row.stock))) {
    return {
      availability: AVAILABILITY.UNKNOWN,
      treatAsStock: false,
      purchasable: false,
      live: false,
      sku: row.sku || null,
      reason: "STOCK_UNKNOWN",
    };
  }
  if (row.timestamp) {
    const parsed = Date.parse(row.timestamp);
    const staleAfterMs = context.staleAfterMs || 48 * 60 * 60 * 1000;
    if (Number.isNaN(parsed) || Date.now() - parsed > staleAfterMs) {
      return {
        availability: AVAILABILITY.STALE,
        treatAsStock: false,
        purchasable: false,
        live: false,
        sku: row.sku || null,
        stock: Number(row.stock),
        reason: "STALE_SUPPLIER_STOCK",
      };
    }
  } else if (context.requireTimestamp !== false) {
    return {
      availability: AVAILABILITY.STALE,
      treatAsStock: false,
      purchasable: false,
      live: false,
      sku: row.sku || null,
      stock: Number(row.stock),
      reason: "MISSING_STOCK_TIMESTAMP",
    };
  }
  const stock = Number(row.stock);
  if (stock <= 0) {
    return {
      availability: AVAILABILITY.OUT_OF_STOCK,
      treatAsStock: true,
      purchasable: false,
      live: false,
      sku: row.sku || null,
      stock,
      reason: "OUT_OF_STOCK",
    };
  }
  return {
    availability: AVAILABILITY.IN_STOCK,
    treatAsStock: true,
    purchasable: true,
    live: false,
    sku: row.sku || null,
    stock,
    reason: null,
    note: "Fixture/dry-run availability only. Not a live supplier quantity.",
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
  AVAILABILITY,
  parseCsv,
  parseXml,
  parseJson,
  preview,
  previewIdempotent,
  resetPreviewIdempotency,
  adapterStatus,
  recordPreview,
  rejectLiveFetch,
  circuitStatus,
  resetCircuit,
  classifyOutage,
  classifyAvailability,
  detectSourceIdConflicts,
};
