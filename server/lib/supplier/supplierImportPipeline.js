/**
 * Part 23 — Supplier import pipeline.
 * API, XML, and CSV feeds normalize to one record shape, then each row is
 * mapped through the dry catalog. Nothing is written to PIM, stock, or price.
 */
const crypto = require("crypto");
const { mapSupplierProduct } = require("./supplierMappingService");

const COMMON_FEED_FIELDS = Object.freeze([
  "supplierSku",
  "sku",
  "ean",
  "gtin",
  "mpn",
  "brand",
  "title",
  "category",
  "images",
  "supplierId",
]);

function normalizeRecordFields(raw = {}) {
  const images = Array.isArray(raw.images) ? raw.images : raw.image_url ? [raw.image_url] : [];
  return {
    supplier_sku: raw.supplier_sku || raw.supplierSku || raw.sku || "",
    name: raw.name || raw.title || "",
    ean_gtin: raw.ean_gtin || raw.gtin || raw.ean || "",
    mpn: raw.mpn || "",
    brand: raw.brand || "",
    supplier_category: raw.supplier_category || raw.category || "",
    buzzard_category: raw.buzzard_category || raw.buzzardCategory || null,
    description: raw.description || "",
    supplier_price: raw.supplier_price || (raw.price != null ? { amount: raw.price, currency: raw.currency || "EUR" } : null),
    currency: raw.currency || raw.supplier_price?.currency || null,
    stock: raw.stock ?? raw.supplier_stock ?? null,
    reserved_stock: raw.reserved_stock ?? raw.reservedStock ?? null,
    stock_updated_at: raw.stock_updated_at || raw.stockUpdatedAt || raw.updatedAt || null,
    shipping_cost: raw.shipping_cost ?? raw.shippingCost ?? null,
    marketplace_fee: raw.marketplace_fee ?? raw.marketplaceFee ?? null,
    payment_fee: raw.payment_fee ?? raw.paymentFee ?? null,
    return_reserve: raw.return_reserve ?? raw.returnReserve ?? null,
    other_cost: raw.other_cost ?? raw.otherCost ?? null,
    comparable_market_price: raw.comparable_market_price ?? raw.comparableMarketPrice ?? null,
    country: raw.country || null,
    images,
  };
}

function feedIdentity(normalized, catalog) {
  const sku = catalog?.sku || String(normalized.supplier_sku || "").trim();
  const ean = catalog?.ean || String(normalized.ean_gtin || "").replace(/\D/g, "");
  return {
    sku: sku || null,
    ean: ean || null,
    skuKey: sku ? `sku:${sku.toLowerCase()}` : null,
    eanKey: ean ? `ean:${ean}` : null,
  };
}

function categoryCode(mapping) {
  return mapping.findings.find((finding) => finding.field === "category")?.code || null;
}

/**
 * Classify one feed batch. Duplicate SKU or EAN stays a separate row.
 * The first row is not rewritten and the rows are not merged.
 */
function importSupplierFeed({ supplierId, format = null, records = [], knownFingerprints = null } = {}) {
  const seen = knownFingerprints instanceof Set ? knownFingerprints : new Set(knownFingerprints || []);
  const catalog = [];
  const rejected = [];
  const duplicates = [];
  const processed = [];

  records.forEach((raw, index) => {
    const normalized = normalizeRecordFields(raw);
    const mapping = mapSupplierProduct(normalized, {
      supplierId,
      buzzardCategory: normalized.buzzard_category,
    });
    const identity = feedIdentity(normalized, mapping.catalog);
    const skuDup = Boolean(identity.skuKey && seen.has(identity.skuKey));
    const eanDup = Boolean(identity.eanKey && seen.has(identity.eanKey));
    if (identity.skuKey) seen.add(identity.skuKey);
    if (identity.eanKey) seen.add(identity.eanKey);

    const base = {
      index,
      format,
      supplierId: supplierId || null,
      supplierSku: identity.sku,
      ean: identity.ean,
      normalized,
      merged: false,
      pimWrite: false,
      published: false,
      priceUpdated: false,
      stockUpdated: false,
    };

    if (skuDup || eanDup) {
      const row = {
        ...base,
        matchType: skuDup ? "sku" : "ean",
        code: categoryCode(mapping),
        findings: mapping.findings,
        catalog: null,
      };
      duplicates.push(row);
      processed.push({
        ...base,
        mapping: { status: mapping.status, findings: mapping.findings, code: row.code },
        duplicate: { flagged: true, matchType: row.matchType, merged: false },
        pimStaging: { status: "BLOCKED", reason: "duplicate", pimWrite: false },
      });
      return;
    }

    if (!mapping.ok) {
      const row = {
        ...base,
        code: categoryCode(mapping) || mapping.findings[0]?.code || "RECORD_INVALID",
        findings: mapping.findings,
        catalog: null,
      };
      rejected.push(row);
      processed.push({
        ...base,
        mapping: { status: mapping.status, findings: mapping.findings, code: row.code },
        duplicate: { flagged: false, matchType: null, merged: false },
        pimStaging: { status: "BLOCKED", reason: "validation", pimWrite: false },
      });
      return;
    }

    const row = { ...base, catalog: mapping.catalog };
    catalog.push(row);
    processed.push({
      ...base,
      mapping: { status: mapping.status, findings: mapping.findings, code: "CATEGORY_MATCHED" },
      duplicate: { flagged: false, matchType: null, merged: false },
      catalog: mapping.catalog,
      pimStaging: { status: "DRY_RUN", lifecycleStatus: "NOT_WRITTEN", pimWrite: false },
    });
  });

  return {
    ok: true,
    dryRun: true,
    live: false,
    pimWrite: false,
    published: false,
    priceUpdated: false,
    stockUpdated: false,
    format,
    supplierId: supplierId || null,
    catalog,
    rejected,
    duplicates,
    processed,
    summary: {
      total: records.length,
      catalog: catalog.length,
      rejected: rejected.length,
      duplicates: duplicates.length,
      blocked: rejected.length + duplicates.length,
      staged: 0,
    },
  };
}

async function runSupplierImportPipeline(supplierId, options = {}) {
  const correlationId = options.correlationId || `sup_${crypto.randomBytes(4).toString("hex")}_import`;
  let records = options.records;
  let format = options.format || null;

  if (!records) {
    const { getSupplierAdapter } = require("./supplierRegistry");
    const adapter = getSupplierAdapter(supplierId);
    if (!adapter) {
      return {
        ok: false,
        dryRun: true,
        live: false,
        pimWrite: false,
        correlationId,
        error: "unknown_supplier",
        stages: [],
        catalog: [],
        rejected: [],
        duplicates: [],
        processed: [],
      };
    }
    const fetchResult = adapter.fetchProductsDryRun
      ? await adapter.fetchProductsDryRun({ limit: options.limit || 10 })
      : { records: [] };
    records = fetchResult.records || [];
    format = adapter.adapterFormat || adapter.format || format;
  }

  const feed = importSupplierFeed({
    supplierId,
    format,
    records,
    knownFingerprints: options.knownFingerprints,
  });
  const blocked = feed.summary.blocked > 0;

  return {
    ...feed,
    correlationId,
    stages: [
      { stage: "supplier", status: "PASS", supplierId },
      { stage: "adapter", status: "PASS", dryRun: true, recordCount: records.length, format },
      { stage: "normalization", status: "PASS", count: records.length },
      {
        stage: "validation",
        status: feed.rejected.length ? "CONDITION" : "PASS",
      },
      {
        stage: "duplicate_detection",
        status: feed.duplicates.length ? "CONDITION" : "PASS",
      },
      { stage: "pim_staging", status: blocked ? "CONDITION" : "PASS", dryRun: true, livePublish: false, pimWrite: false },
    ],
  };
}

async function validateSupplierRecords(supplierId, records = [], options = {}) {
  return importSupplierFeed({
    supplierId,
    format: options.format || null,
    records,
    knownFingerprints: options.knownFingerprints,
  });
}

module.exports = {
  COMMON_FEED_FIELDS,
  runSupplierImportPipeline,
  validateSupplierRecords,
  importSupplierFeed,
  normalizeRecordFields,
};
