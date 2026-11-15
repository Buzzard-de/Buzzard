const crypto = require("crypto");
const { adaptGetProduct, SYNTHETIC_SOURCE } = require("./pusatGetProductAdapter");

const ACTION = "GET_PRODUCT";
const RESERVED_SOURCES = new Set(["D", "LIVE", "MOCK", "COMMERCE", "PUSAT"]);
const SOURCE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ACTOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;
const PUBLIC_CODES = new Set([
  "INVALID_PAYLOAD",
  "NOT_FOUND",
  "SOURCE_REFUSED",
  "SOT_ACTIVE_REQUIRED",
  "CATALOG_CONNECTION_REQUIRED",
  "CATALOG_READ_ONLY",
  "CATALOG_READ_ONLY_UNAVAILABLE",
  "CATALOG_SCOPE_REFUSED",
  "CATALOG_KEY_AMBIGUOUS",
  "CATALOG_RESULT_LIMIT",
  "CATALOG_INTEGRITY_FAILED",
  "DATA_PATH_REFUSED",
  "DATABASE_FILE_REQUIRED",
  "REQUEST_REFUSED",
]);

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

function failure(code, correlationId) {
  return {
    ok: false,
    code: PUBLIC_CODES.has(code) ? code : "REQUEST_REFUSED",
    action: ACTION,
    correlationId,
    ...dryRunLabel(),
  };
}

function translateGetProduct({
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
  if (actorId != null && (typeof actorId !== "string" || !ACTOR_PATTERN.test(actorId))) {
    return failure("INVALID_PAYLOAD", correlation);
  }

  let result;
  try {
    result = adaptGetProduct({
      catalog,
      payload,
      actorId,
      correlationId: correlation,
      sotActive,
      source: resolvedSource,
    });
  } catch (error) {
    return failure(error && error.code, correlation);
  }

  if (!result || result.ok !== true) {
    const envelope = failure(result && result.code, correlation);
    if (envelope.code === "NOT_FOUND") {
      envelope.mappingStatus = "UNMAPPED";
      envelope.sotActive = false;
      envelope.sotClaim = "UNVERIFIED";
    }
    return envelope;
  }

  const data = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
  const product = {
    id: data.id,
    sku: data.sku,
    title: data.title,
    status: data.status,
    visibility: data.visibility,
    stock: null,
    price: null,
  };
  for (const key of ["id", "sku", "title", "status", "visibility"]) {
    if (typeof product[key] !== "string") return failure("REQUEST_REFUSED", correlation);
  }
  return {
    ok: true,
    action: ACTION,
    data: product,
    source: resolvedSource,
    mappingStatus: "CANDIDATE",
    sotActive: false,
    sotClaim: "UNVERIFIED",
    actorId: actorId == null ? null : actorId,
    correlationId: correlation,
    ...dryRunLabel(),
  };
}

module.exports = {
  ACTION,
  SYNTHETIC_SOURCE,
  translateGetProduct,
};
