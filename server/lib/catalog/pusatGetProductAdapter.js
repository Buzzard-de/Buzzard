const crypto = require("crypto");
const { isCatalogSession } = require("./readOnlyCatalog");

const ACTION = "GET_PRODUCT";

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
  if (typeof value === "string" && value.trim()) return value;
  return `pusat_${crypto.randomBytes(6).toString("hex")}`;
}

function invalidPayload(correlationId) {
  return {
    ok: false,
    code: "INVALID_PAYLOAD",
    action: ACTION,
    correlationId,
    ...dryRunLabel(),
  };
}

function assertReadOnlyConnection(catalog) {
  if (!catalog || typeof catalog.readProductForPusat !== "function") {
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  if (!catalog.capabilities || catalog.capabilities.write !== false) {
    throw refusal("CATALOG_READ_ONLY");
  }
  if (!isCatalogSession(catalog)) throw refusal("CATALOG_CONNECTION_REQUIRED");
  let queryOnly = false;
  try {
    queryOnly = catalog.queryOnly() === true;
  } catch {
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  if (!queryOnly) throw refusal("CATALOG_READ_ONLY");
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
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  const key = record ? record.id || record.sku : "";
  if (!key) return invalidPayload(correlation);
  if (typeof sotActive !== "boolean") throw refusal("SOT_ACTIVE_REQUIRED");
  assertReadOnlyConnection(catalog);

  let product;
  try {
    product = catalog.readProductForPusat(key);
  } catch (error) {
    if (error && (error.code === "CATALOG_READ_ONLY" || error.code === "CATALOG_SCOPE_REFUSED")) throw error;
    throw refusal("CATALOG_CONNECTION_REQUIRED");
  }
  if (!product) {
    return {
      ok: false,
      code: "NOT_FOUND",
      action: ACTION,
      correlationId: correlation,
      mappingStatus: "UNMAPPED",
      sotActive,
      ...dryRunLabel(),
    };
  }

  return {
    ok: true,
    action: ACTION,
    data: {
      id: product.id,
      sku: product.sku,
      title: product.title,
      status: product.status,
      visibility: product.visibility,
      stock: null,
      price: null,
    },
    source: typeof source === "string" && source.trim() ? source : "UNKNOWN",
    mappingStatus: "CANDIDATE",
    sotActive,
    actorId,
    correlationId: correlation,
    ...dryRunLabel(),
  };
}

module.exports = {
  ACTION,
  adaptGetProduct,
};
