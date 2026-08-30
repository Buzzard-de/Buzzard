/**
 * Part 15 — Real supplier connector abstraction.
 *
 * Production-ready interface for B2B automotive supplier integration.
 * Does NOT call live endpoints until credentials are explicitly configured
 * and REAL_SUPPLIER_LIVE_IMPORT=1 (still subject to production safety gate).
 *
 * Default mode: dry-run (no outbound HTTP).
 */
const productValidator = require("../productValidator");
const { checkProductionSafety } = require("../pim/productionSafetyGate");
const {
  isTestOnlySupplier,
  assertProductionSupplier,
} = require("./supplierProductionGuard");

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RATE_LIMIT_RPM = 60;

const rateLimitState = new Map();

function envFlag(name, defaultValue = "0") {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue === "1";
  return raw === "1" || raw.toLowerCase() === "true";
}

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function resolveConfig(overrides = {}) {
  const supplierCode =
    overrides.supplierCode ||
    process.env.REAL_SUPPLIER_CODE ||
    process.env.SUPPLIER_CODE ||
    "";

  const apiUrl =
    overrides.apiUrl ||
    process.env.REAL_SUPPLIER_API_URL ||
    process.env.SUPPLIER_API_URL ||
    "";

  const apiKey =
    overrides.apiKey ||
    process.env.REAL_SUPPLIER_API_KEY ||
    process.env.SUPPLIER_API_KEY ||
    "";

  return {
    supplierCode,
    apiUrl,
    apiKey: apiKey ? "[REDACTED]" : "",
    apiKeyPresent: Boolean(apiKey),
    authType: overrides.authType || process.env.REAL_SUPPLIER_AUTH_TYPE || "api_key",
    feedFormat: overrides.feedFormat || process.env.REAL_SUPPLIER_FEED_FORMAT || "json",
    timeoutMs: overrides.timeoutMs ?? envInt("REAL_SUPPLIER_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxRetries: overrides.maxRetries ?? envInt("REAL_SUPPLIER_MAX_RETRIES", DEFAULT_MAX_RETRIES),
    rateLimitRpm: overrides.rateLimitRpm ?? envInt("REAL_SUPPLIER_RATE_LIMIT_RPM", DEFAULT_RATE_LIMIT_RPM),
    dryRun: overrides.dryRun ?? envFlag("REAL_SUPPLIER_DRY_RUN", "1"),
    liveImportEnabled: overrides.liveImportEnabled ?? envFlag("REAL_SUPPLIER_LIVE_IMPORT", "0"),
    _apiKeyRaw: apiKey,
  };
}

function redactSecrets(obj) {
  const copy = { ...obj };
  if (copy._apiKeyRaw) copy._apiKeyRaw = "[REDACTED]";
  if (copy.apiKey && copy.apiKey !== "[REDACTED]") copy.apiKey = "[REDACTED]";
  return copy;
}

function validateGtin(gtin) {
  const result = productValidator.validateEan(gtin);
  if (!result.ok) {
    return { ok: false, code: result.error || "invalid_gtin", value: result.value };
  }
  if (result.warning === "missing_ean") {
    return { ok: false, code: "missing_gtin", value: "" };
  }
  return { ok: true, value: result.value };
}

function validateMpn(mpn) {
  const value = String(mpn || "").trim();
  if (!value) return { ok: false, code: "missing_mpn" };
  if (value.length < 2 || value.length > 64) return { ok: false, code: "invalid_mpn_length" };
  if (/^(mock|demo|test|n\/a|na|none)$/i.test(value)) {
    return { ok: false, code: "invalid_mpn_placeholder" };
  }
  if (/^(mock|demo|test)[-_\s]/i.test(value)) {
    return { ok: false, code: "invalid_mpn_placeholder" };
  }
  return { ok: true, value };
}

function validateImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return { ok: false, code: "missing_image" };
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, code: "invalid_image_protocol" };
    }
    if (parsed.hostname.endsWith(".example") || parsed.hostname === "example.com") {
      return { ok: false, code: "test_only_image_host" };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, code: "invalid_image_url" };
  }
}

function validateSupplierRecord(record, { requireMpn = true, requireImage = true } = {}) {
  const errors = [];

  const gtinCheck = validateGtin(record.ean_gtin || record.gtin || record.ean);
  if (!gtinCheck.ok) errors.push({ field: "gtin", code: gtinCheck.code });

  if (requireMpn) {
    const mpnCheck = validateMpn(record.mpn || record.manufacturer_part_number || record.oem_number);
    if (!mpnCheck.ok) errors.push({ field: "mpn", code: mpnCheck.code });
  }

  const images = Array.isArray(record.images)
    ? record.images
    : record.image_url
      ? [record.image_url]
      : record.primary_image
        ? [record.primary_image]
        : [];

  if (requireImage) {
    if (!images.length) {
      errors.push({ field: "images", code: "missing_image" });
    } else {
      const imageCheck = validateImageUrl(images[0]);
      if (!imageCheck.ok) errors.push({ field: "images", code: imageCheck.code });
    }
  }

  if (!record.supplier_sku && !record.sku) {
    errors.push({ field: "supplier_sku", code: "missing_supplier_sku" });
  }

  if (!record.name && !record.title) {
    errors.push({ field: "title", code: "missing_title" });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function buildAuthHeaders(config) {
  const headers = { Accept: "application/json", "User-Agent": "Buzzard-Supplier-Connector/1.0" };
  const key = config._apiKeyRaw;

  switch (String(config.authType || "api_key").toLowerCase()) {
    case "basic": {
      if (key) {
        const encoded = Buffer.from(key).toString("base64");
        headers.Authorization = `Basic ${encoded}`;
      }
      break;
    }
    case "bearer":
      if (key) headers.Authorization = `Bearer ${key}`;
      break;
    case "api_key":
    default:
      if (key) headers["X-API-Key"] = key;
      break;
  }

  return headers;
}

function checkRateLimit(supplierCode, limitRpm) {
  const key = String(supplierCode || "default");
  const now = Date.now();
  const windowMs = 60_000;
  const state = rateLimitState.get(key) || { windowStart: now, count: 0 };

  if (now - state.windowStart >= windowMs) {
    state.windowStart = now;
    state.count = 0;
  }

  state.count += 1;
  rateLimitState.set(key, state);

  if (state.count > limitRpm) {
    const err = new Error(`Rate limit exceeded for supplier ${key} (${limitRpm} req/min)`);
    err.code = "rate_limit_exceeded";
    throw err;
  }
}

function areCredentialsConfigured(config) {
  return Boolean(config.supplierCode && config.apiUrl && config._apiKeyRaw);
}

function canAttemptLiveFetch(config) {
  const safety = checkProductionSafety();
  if (!safety.ok) {
    return { ok: false, reason: "production_safety_blocked", issues: safety.issues };
  }
  if (config.dryRun) {
    return { ok: false, reason: "dry_run_mode" };
  }
  if (!config.liveImportEnabled) {
    return { ok: false, reason: "live_import_disabled" };
  }
  if (!areCredentialsConfigured(config)) {
    return { ok: false, reason: "credentials_not_configured" };
  }
  if (isTestOnlySupplier({ supplierId: config.supplierCode, apiUrl: config.apiUrl })) {
    return { ok: false, reason: "test_only_supplier" };
  }
  return { ok: true };
}

async function fetchWithRetry(url, options = {}, config) {
  checkRateLimit(config.supplierCode, config.rateLimitRpm);

  let lastError;
  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) return response;

      lastError = new Error(`HTTP ${response.status} from supplier API`);
      lastError.code = "supplier_http_error";
      lastError.status = response.status;

      if (response.status < 500) break;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      lastError.code = err.name === "AbortError" ? "supplier_timeout" : "supplier_fetch_failed";
    }

    if (attempt < config.maxRetries) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 8000)));
    }
  }

  throw lastError;
}

function normalizeSupplierProduct(raw, supplierCode) {
  const images = Array.isArray(raw.images)
    ? raw.images.filter(Boolean)
    : raw.image_url
      ? [raw.image_url]
      : raw.primary_image
        ? [raw.primary_image]
        : [];

  return {
    supplierCode,
    supplierSku: raw.supplier_sku || raw.sku || raw.article_number || "",
    ean: raw.ean_gtin || raw.gtin || raw.ean || null,
    gtin: raw.ean_gtin || raw.gtin || raw.ean || null,
    mpn: raw.mpn || raw.manufacturer_part_number || raw.oem_number || null,
    brand: raw.brand || raw.manufacturer || null,
    title: raw.name || raw.title || "",
    description: raw.description || raw.short_description || "",
    category: raw.supplier_category || raw.category || null,
    purchasePrice: raw.supplier_price?.amount ?? raw.cost ?? raw.purchase_price ?? null,
    currency: raw.supplier_price?.currency || raw.currency || "EUR",
    retailPrice: raw.retail_price?.amount ?? raw.rrp ?? null,
    stock: Number(raw.stock ?? raw.quantity ?? 0),
    images,
    vehicleFitment: raw.vehicle_fitment || raw.compatibility || [],
    tecdocArticle: raw.tecdoc_article || raw.tecdocArticle || null,
    availability: raw.availability || (Number(raw.stock) > 0 ? "in_stock" : "out_of_stock"),
    raw,
  };
}

class RealSupplierConnector {
  constructor(overrides = {}) {
    this.config = resolveConfig(overrides);
    if (overrides.apiKey) this.config._apiKeyRaw = overrides.apiKey;
  }

  getStatus() {
    const safety = checkProductionSafety();
    const credentials = areCredentialsConfigured(this.config);
    const testOnly = isTestOnlySupplier({
      supplierId: this.config.supplierCode,
      apiUrl: this.config.apiUrl,
    });
    const liveAllowed = canAttemptLiveFetch(this.config);

    return {
      supplierCode: this.config.supplierCode || null,
      apiUrlConfigured: Boolean(this.config.apiUrl),
      credentialsConfigured: credentials,
      dryRun: this.config.dryRun,
      liveImportEnabled: this.config.liveImportEnabled,
      testOnlySupplier: testOnly,
      productionSafetyOk: safety.ok,
      goLiveLockActive: safety.goLiveLock,
      salesEnabled: safety.salesEnabled,
      canConnectLive: liveAllowed.ok,
      blockedReason: liveAllowed.ok ? null : liveAllowed.reason,
      config: redactSecrets(this.config),
    };
  }

  assertCanConnect() {
    assertProductionSupplier({
      supplierId: this.config.supplierCode,
      apiUrl: this.config.apiUrl,
    });

    const live = canAttemptLiveFetch(this.config);
    if (!live.ok) {
      const err = new Error(`Live supplier connection blocked: ${live.reason}`);
      err.code = live.reason;
      err.details = live.issues || null;
      throw err;
    }
  }

  async fetchCatalog(options = {}) {
    const limit = Math.min(Number(options.limit) || 100, 1000);
    const status = this.getStatus();

    if (!this.config.supplierCode) {
      return {
        ok: false,
        dryRun: true,
        live: false,
        error: "unknown_supplier",
        message: "REAL_SUPPLIER_CODE is not configured",
        records: [],
        status,
      };
    }

    if (isTestOnlySupplier({ supplierId: this.config.supplierCode, apiUrl: this.config.apiUrl })) {
      return {
        ok: false,
        dryRun: true,
        live: false,
        error: "test_only_supplier",
        message: `${this.config.supplierCode} is TEST ONLY`,
        records: [],
        status,
      };
    }

    const liveCheck = canAttemptLiveFetch(this.config);
    if (!liveCheck.ok) {
      return {
        ok: true,
        dryRun: true,
        live: false,
        message: `Dry-run mode — live fetch blocked (${liveCheck.reason})`,
        records: [],
        total: 0,
        fetchedAt: new Date().toISOString(),
        status,
      };
    }

    this.assertCanConnect();

    const headers = buildAuthHeaders(this.config);
    const url = new URL(this.config.apiUrl);
    if (limit) url.searchParams.set("limit", String(limit));

    const response = await fetchWithRetry(
      url.toString(),
      { method: "GET", headers },
      this.config
    );

    const payload = await response.json();
    const rawRecords = Array.isArray(payload) ? payload : payload?.products || payload?.records || [];
    const records = rawRecords.slice(0, limit).map((row) => normalizeSupplierProduct(row, this.config.supplierCode));

    return {
      ok: true,
      dryRun: false,
      live: true,
      records,
      total: rawRecords.length,
      fetchedAt: new Date().toISOString(),
      status: this.getStatus(),
    };
  }

  validateRecords(records, options = {}) {
    return (records || []).map((record) => {
      const validation = validateSupplierRecord(record, options);
      return {
        supplierSku: record.supplier_sku || record.sku,
        ok: validation.ok,
        errors: validation.errors,
      };
    });
  }
}

function createConnectorFromEnv(overrides = {}) {
  return new RealSupplierConnector(overrides);
}

function isLiveImportEnabled() {
  return envFlag("REAL_SUPPLIER_LIVE_IMPORT", "0");
}

module.exports = {
  RealSupplierConnector,
  createConnectorFromEnv,
  resolveConfig,
  validateGtin,
  validateMpn,
  validateImageUrl,
  validateSupplierRecord,
  buildAuthHeaders,
  normalizeSupplierProduct,
  areCredentialsConfigured,
  canAttemptLiveFetch,
  isLiveImportEnabled,
  redactSecrets,
};
