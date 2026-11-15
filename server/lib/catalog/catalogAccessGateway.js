const crypto = require("crypto");
const { openReadOnlyCatalog } = require("./readOnlyCatalog");
const { translateGetProduct, SYNTHETIC_SOURCE } = require("./getProductTranslator");

const ACTOR = "pusat";
const TTL_MS = 60_000;
const HANDLE_PATTERN = /^[0-9a-f]{64}$/;
const registry = new Map();

const OPEN_CODES = new Set([
  "DATA_PATH_REFUSED",
  "DATABASE_FILE_REQUIRED",
  "CATALOG_INTEGRITY_FAILED",
  "CATALOG_READ_ONLY",
  "CATALOG_READ_ONLY_UNAVAILABLE",
  "REQUEST_REFUSED",
]);

function refusal(code) {
  const error = new Error(code);
  error.code = code;
  error.stack = undefined;
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

function denied(code) {
  return {
    ok: false,
    code,
    action: "GET_PRODUCT",
    ...dryRunLabel(),
  };
}

function drop(record) {
  if (!record) return;
  registry.delete(record.handle);
  try { record.session.close(); } catch { /* the catalog session is already closed */ }
}

function lookup(handle, now) {
  if (typeof handle !== "string" || !HANDLE_PATTERN.test(handle)) return { state: "absent" };
  const record = registry.get(handle);
  if (!record || record.actor !== ACTOR) return { state: "absent" };
  if (record.expiresAt <= now) {
    drop(record);
    return { state: "expired" };
  }
  return { state: "live", record };
}

function minimize(result) {
  if (!result || result.ok !== true) {
    const failure = denied(result && typeof result.code === "string" ? result.code : "REQUEST_REFUSED");
    if (failure.code === "NOT_FOUND") {
      failure.mappingStatus = "UNMAPPED";
      failure.sotActive = false;
      failure.sotClaim = "UNVERIFIED";
    }
    return failure;
  }
  const data = result.data && typeof result.data === "object" ? result.data : {};
  return {
    ok: true,
    action: "GET_PRODUCT",
    data: {
      id: data.id,
      sku: data.sku,
      title: data.title,
      status: data.status,
      visibility: data.visibility,
      stock: null,
      price: null,
    },
    source: SYNTHETIC_SOURCE,
    mappingStatus: "CANDIDATE",
    sotActive: false,
    sotClaim: "UNVERIFIED",
    actorId: ACTOR,
    correlationId: typeof result.correlationId === "string" ? result.correlationId : null,
    ...dryRunLabel(),
  };
}

function openForPusat(dbPath) {
  let session;
  try {
    session = openReadOnlyCatalog({ dbPath });
  } catch (error) {
    const code = error && OPEN_CODES.has(error.code) ? error.code : "REQUEST_REFUSED";
    throw refusal(code);
  }
  const handle = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + TTL_MS;
  registry.set(handle, { handle, session, expiresAt, actor: ACTOR });
  return {
    ok: true,
    handle,
    expiresAt,
    ...dryRunLabel(),
  };
}

function getProduct(handle, payload, options = {}) {
  const now = Date.now();
  const found = lookup(handle, now);
  if (found.state === "expired") return denied("CATALOG_CONNECTION_REQUIRED");
  if (found.state !== "live") return denied("ACTOR_REFUSED");
  if (options && Object.prototype.hasOwnProperty.call(options, "actorId")) return denied("ACTOR_REFUSED");
  return minimize(translateGetProduct({
    catalog: found.record.session,
    payload,
    actorId: ACTOR,
    correlationId: options && options.correlationId,
    sotActive: false,
    source: SYNTHETIC_SOURCE,
  }));
}

function close(handle) {
  const found = lookup(handle, Date.now());
  if (found.state !== "live") return denied("CATALOG_CONNECTION_REQUIRED");
  drop(found.record);
  return {
    ok: true,
    closed: true,
    ...dryRunLabel(),
  };
}

module.exports = {
  openForPusat,
  getProduct,
  close,
};
