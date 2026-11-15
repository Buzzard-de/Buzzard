const crypto = require("crypto");
const { isCatalogSession } = require("./readOnlyCatalog");

const ACTION = "GET_PRODUCT";
const SYNTHETIC_SOURCE = "SYNTHETIC_CATALOG";
const RESERVED_SOURCES = new Set(["D", "LIVE", "MOCK", "COMMERCE", "PUSAT"]);
const SOURCE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ID_SQL = "SELECT id, sku, title, status, visibility FROM catalog_products WHERE id = ?";
const SKU_SQL = "SELECT id, sku, title, status, visibility FROM catalog_products WHERE sku = ?";
const ACTOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;

function refusal(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function dryRunLabel() {
  return {
    mode: "DRY_RUN",
    live: false,
    mock: false,
    dryRun: true,
  };
}

function correlationOf(value) {
  if (typeof value === "string" && CORRELATION_PATTERN.test(value)) return value;
  return `pusat_${crypto.randomBytes(6).toString("hex")}`;
}

function resolveSource(source) {
  if (source == null) return "UNKNOWN";
  if (typeof source !== "string") return null;
  if (!source.trim()) return "UNKNOWN";
  const token = source.trim();
  if (RESERVED_SOURCES.has(token.toUpperCase())) return null;
  if (token !== "UNKNOWN" && token !== SYNTHETIC_SOURCE && !SOURCE_PATTERN.test(token)) return null;
  if (token.toUpperCase() === "D") return null;
  return token;
}

function resolveActor(actorId) {
  if (actorId == null) return null;
  if (typeof actorId !== "string" || !ACTOR_PATTERN.test(actorId)) return undefined;
  return actorId;
}

function failure(code, correlationId) {
  return {
    ok: false,
    code,
    action: ACTION,
    correlationId,
    ...dryRunLabel(),
  };
}

function ownString(record, name) {
  if (!Object.prototype.hasOwnProperty.call(record, name)) return "";
  const value = record[name];
  if (value == null || value === "") return "";
  if (typeof value !== "string" || value.length > 128 || value.includes("\0")) return null;
  return value;
}

function payloadKeys(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const id = ownString(payload, "id");
  const sku = ownString(payload, "sku");
  if (id === null || sku === null) return null;
  if (!id && !sku) return null;
  return { id, sku };
}

function assertReadOnlyConnection(catalog) {
  if (!catalog || typeof catalog.readProductForPusat !== "function") {
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  if (!catalog.capabilities || catalog.capabilities.write !== false) {
    throw refusal("CATALOG_READ_ONLY");
  }
  if (!isCatalogSession(catalog) || typeof catalog.readSql !== "function") {
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  let queryOnly = false;
  try {
    queryOnly = catalog.queryOnly() === true;
  } catch (error) {
    if (error && error.code === "CATALOG_INTEGRITY_FAILED") throw error;
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  if (!queryOnly) throw refusal("CATALOG_READ_ONLY");
}

function oneRow(catalog, sql, value) {
  let rows;
  try {
    rows = catalog.readSql(sql, [value]);
  } catch (error) {
    if (error && (error.code === "CATALOG_READ_ONLY" || error.code === "CATALOG_SCOPE_REFUSED" || error.code === "CATALOG_KEY_AMBIGUOUS" || error.code === "CATALOG_INTEGRITY_FAILED" || error.code === "CATALOG_CONNECTION_REQUIRED" || error.code === "REQUEST_REFUSED")) {
      throw error;
    }
    throw refusal("REQUEST_REFUSED");
  }
  if (!Array.isArray(rows)) throw refusal("CATALOG_SCOPE_REFUSED");
  if (rows.length > 1) throw refusal("CATALOG_KEY_AMBIGUOUS");
  return rows[0] || null;
}

function findProduct(catalog, id, sku) {
  if (id) {
    const byId = oneRow(catalog, ID_SQL, id);
    if (byId) return byId;
  }
  if (sku) return oneRow(catalog, SKU_SQL, sku);
  return null;
}

function productData(row) {
  if (!row || typeof row !== "object") return null;
  const data = {
    id: row.id,
    sku: row.sku,
    title: row.title,
    status: row.status,
    visibility: row.visibility,
    stock: null,
    price: null,
  };
  for (const key of ["id", "sku", "title", "status", "visibility"]) {
    if (typeof data[key] !== "string") return null;
  }
  return data;
}

function sotClaim() {
  return {
    sotActive: false,
    sotClaim: "UNVERIFIED",
  };
}

function adaptGetProduct({
  catalog,
  payload,
  actorId = null,
  correlationId,
  sotActive,
  source,
} = {}) {
  const correlation = correlationOf(correlationId);
  const resolvedSource = resolveSource(source);
  if (!resolvedSource) return failure("SOURCE_REFUSED", correlation);
  const resolvedActor = resolveActor(actorId);
  if (resolvedActor === undefined) return failure("INVALID_PAYLOAD", correlation);
  const keys = payloadKeys(payload);
  if (!keys) return failure("INVALID_PAYLOAD", correlation);
  if (typeof sotActive !== "boolean") throw refusal("SOT_ACTIVE_REQUIRED");
  assertReadOnlyConnection(catalog);

  let row;
  try {
    row = findProduct(catalog, keys.id, keys.sku);
  } catch (error) {
    if (error && (error.code === "CATALOG_READ_ONLY" || error.code === "CATALOG_SCOPE_REFUSED" || error.code === "CATALOG_KEY_AMBIGUOUS" || error.code === "CATALOG_INTEGRITY_FAILED" || error.code === "CATALOG_CONNECTION_REQUIRED" || error.code === "REQUEST_REFUSED")) {
      throw error;
    }
    throw refusal("REQUEST_REFUSED");
  }
  if (!row) {
    return {
      ok: false,
      code: "NOT_FOUND",
      action: ACTION,
      correlationId: correlation,
      mappingStatus: "UNMAPPED",
      ...sotClaim(),
      ...dryRunLabel(),
    };
  }

  const data = productData(row);
  if (!data) throw refusal("REQUEST_REFUSED");
  return {
    ok: true,
    action: ACTION,
    data,
    source: resolvedSource,
    mappingStatus: "CANDIDATE",
    ...sotClaim(),
    actorId: resolvedActor,
    correlationId: correlation,
    ...dryRunLabel(),
  };
}

module.exports = {
  ACTION,
  SYNTHETIC_SOURCE,
  adaptGetProduct,
};
