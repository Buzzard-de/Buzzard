const productStore = require("./productStore");
const supplierStore = require("./supplierStore");
const pricing = require("./pricing");
const syncLog = require("./syncLog");
const productValidator = require("./productValidator");
const customsAi = require("./customsAi");

function slugify(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeIncomingRecord(raw, supplierId) {
  return {
    supplier_id: supplierId,
    supplier_sku: String(raw.supplier_sku || raw.sku || "").trim(),
    ean_gtin: String(raw.ean_gtin || raw.ean || raw.gtin || "").trim(),
    brand: String(raw.brand || "").trim(),
    manufacturer: String(raw.manufacturer || raw.brand || "").trim(),
    name: String(raw.name || "").trim(),
    short_description: String(raw.short_description || raw.description || "").slice(0, 240),
    description: String(raw.description || raw.short_description || "").trim(),
    supplier_category: String(raw.supplier_category || raw.category || "").trim(),
    supplier_price: {
      amount: Number(raw.supplier_price?.amount ?? raw.purchase_price ?? raw.price ?? 0),
      currency: raw.supplier_price?.currency || raw.currency || "EUR",
    },
    stock: Number(raw.stock ?? 0),
    images: Array.isArray(raw.images) ? raw.images : [],
    attributes: raw.attributes && typeof raw.attributes === "object" ? raw.attributes : {},
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    vehicle_fitment: Array.isArray(raw.vehicle_fitment) ? raw.vehicle_fitment : [],
  };
}

function buildBuzzardProduct(record, supplier, options = {}) {
  const buzzardCategory =
    supplierStore.mapSupplierCategory(supplier.supplier_id, record.supplier_category) ||
    options.defaultCategoryId ||
    "cat-05";

  const salePrice = pricing.calculateSalePrice({
    supplierPrice: record.supplier_price.amount,
    markupPercent: supplier.default_markup_percent,
    minimumMarginPercent: supplier.minimum_margin_percent,
    currency: record.supplier_price.currency,
  });

  const stockInfo = pricing.applySafetyStock(record.stock, supplier.safety_stock);
  const slug = slugify(record.name);
  const existing = productStore.findDuplicate({
    supplierId: supplier.supplier_id,
    supplierSku: record.supplier_sku,
    ean: record.ean_gtin,
  });

  const base = existing || {
    id: productStore.nextProductId(),
    sku: `BUZ-${supplier.supplier_id.replace(/[^A-Z0-9]/gi, "").slice(0, 4)}-${record.supplier_sku}`.slice(0, 32),
    created_at: new Date().toISOString(),
  };

  const protectedFields = options.protectedFields || [];
  const next = {
    ...base,
    ean_gtin: record.ean_gtin || base.ean_gtin || "",
    brand: protectedFields.includes("brand") ? base.brand : record.brand || base.brand,
    manufacturer: record.manufacturer || record.brand || base.manufacturer || base.brand,
    name: protectedFields.includes("name") ? base.name : record.name,
    short_description: protectedFields.includes("description")
      ? base.short_description
      : record.short_description,
    description: protectedFields.includes("description") ? base.description : record.description,
    category_id: protectedFields.includes("category_id") ? base.category_id : buzzardCategory,
    category_ids: protectedFields.includes("category_id")
      ? base.category_ids
      : [buzzardCategory],
    images: protectedFields.includes("images") ? base.images : record.images,
    documents: base.documents || [],
    attributes: {
      ...(base.attributes || {}),
      ...(protectedFields.includes("attributes") ? {} : record.attributes),
      vehicle_fitment: record.vehicle_fitment,
    },
    vehicle_compatibility: record.vehicle_fitment || base.vehicle_compatibility || [],
    variants: protectedFields.includes("variants") ? base.variants : record.variants,
    price: salePrice,
    compare_at_price: base.compare_at_price || null,
    vat_rate: base.vat_rate || 19,
    stock: stockInfo.stock,
    stock_status: stockInfo.stock_status,
    supplier_id: supplier.supplier_id,
    supplier_sku: record.supplier_sku,
    supplier_price: record.supplier_price,
    shipping: base.shipping || {
      weight_kg: 1,
      length_cm: 20,
      width_cm: 20,
      height_cm: 10,
      class: "standard",
    },
    seo: protectedFields.includes("seo")
      ? base.seo
      : {
          slug: base.seo?.slug || slug,
          title: `${record.name} | Buzzard`,
          description: record.short_description || record.description || record.name,
        },
    status: base.status || "draft",
    buy_now_enabled: base.buy_now_enabled ?? false,
  };

  if (record.ean_gtin) {
    const eanCheck = productValidator.validateEan(record.ean_gtin);
    if (!eanCheck.ok) {
      next.ean_gtin = record.ean_gtin;
      next.ai_source = "import_ean_warning";
      next.ai_confidence = 0.2;
    } else {
      next.ean_gtin = eanCheck.value;
    }
  }

  const customsAssessment = customsAi.assessCustoms(next);
  if (customsAssessment.customs) {
    next.customs = customsAssessment.customs;
  }

  return { product: next, action: existing ? "updated" : "created" };
}

function processRecords(records, supplierId, ctx = {}) {
  const supplier = supplierStore.getSupplier(supplierId);
  if (!supplier) throw new Error("supplier_not_found");

  const job = syncLog.createSyncJob({ supplierId, mode: ctx.mode || "manual" });
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of records) {
    job.records_read += 1;
    try {
      const normalized = normalizeIncomingRecord(raw, supplierId);
      if (!normalized.supplier_sku || !normalized.name) {
        skipped += 1;
        syncLog.logImportRecord({
          supplier_id: supplierId,
          record_reference: normalized.supplier_sku || normalized.name || "unknown",
          error_type: "validation",
          error_message: "Missing supplier_sku or name",
          sync_job_id: job.id,
        });
        continue;
      }

      const duplicateByEan = normalized.ean_gtin
        ? productStore.findDuplicate({ ean: normalized.ean_gtin })
        : null;
      if (
        duplicateByEan &&
        duplicateByEan.supplier_id !== supplierId &&
        duplicateByEan.supplier_sku !== normalized.supplier_sku
      ) {
        skipped += 1;
        syncLog.logImportRecord({
          supplier_id: supplierId,
          record_reference: normalized.supplier_sku,
          error_type: "duplicate",
          error_message: `EAN already mapped to ${duplicateByEan.id}`,
          sync_job_id: job.id,
        });
        continue;
      }

      const { product, action } = buildBuzzardProduct(normalized, supplier, ctx);
      productStore.upsertProduct(product);
      if (action === "created") created += 1;
      else updated += 1;
    } catch (error) {
      failed += 1;
      syncLog.logImportRecord({
        supplier_id: supplierId,
        record_reference: raw?.supplier_sku || raw?.sku || "unknown",
        error_type: "processing",
        error_message: error.message,
        sync_job_id: job.id,
        retry_status: "pending",
      });
    }
  }

  supplierStore.upsertSupplier({
    ...supplier,
    sync_status: failed > 0 ? "completed_with_errors" : "completed",
    last_sync_at: new Date().toISOString(),
  });

  return syncLog.finishSyncJob(job.id, {
    records_created: created,
    records_updated: updated,
    records_skipped: skipped,
    records_failed: failed,
    status: failed > 0 ? "completed_with_errors" : "completed",
  });
}

function importFromJson(payload, supplierId, ctx) {
  const records = Array.isArray(payload) ? payload : payload.products || payload.items || [];
  return processRecords(records, supplierId, ctx);
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    row.supplier_price = { amount: Number(row.supplier_price || row.purchase_price || 0), currency: "EUR" };
    row.stock = Number(row.stock || 0);
    return row;
  });
}

function importFromCsv(text, supplierId, ctx) {
  return processRecords(parseCsv(text), supplierId, ctx);
}

function importManual(product, supplierId, ctx) {
  return processRecords([product], supplierId, { ...ctx, mode: "manual" });
}

function retryImportLog(logId) {
  const logs = syncLog.listImportLogs(500);
  const entry = logs.find((l) => l.id === logId);
  if (!entry || !entry.raw_record) return null;
  syncLog.updateImportLog(logId, { retry_status: "retrying" });
  const result = processRecords([entry.raw_record], entry.supplier_id, { mode: "incremental" });
  syncLog.updateImportLog(logId, { retry_status: "retried", retried_at: new Date().toISOString() });
  return result;
}

module.exports = {
  normalizeIncomingRecord,
  buildBuzzardProduct,
  processRecords,
  importFromJson,
  importFromCsv,
  importManual,
  retryImportLog,
};
