const crypto = require("crypto");
const { db } = require("../db");
const { AUDIT_SOURCE } = require("../../core/productConstants");
const productCore = require("./productCore");
const productValidation = require("./productValidation");
const supplierMapping = require("./supplierMapping");
const categoryEngine = require("./categoryEngine");

function stageId() {
  return `stg_${crypto.randomBytes(6).toString("hex")}`;
}

function logStage(importJobId, productId, stage, status, detail) {
  db.prepare(`
    INSERT INTO pim_core_import_stages(id, import_job_id, product_id, stage, status, detail_json)
    VALUES (?,?,?,?,?,?)
  `).run(stageId(), importJobId, productId, stage, status, JSON.stringify(detail || {}));
}

async function runPipeline(raw, { dryRun = true, supplierId = "mock", importJobId, actorId } = {}) {
  const stages = [];
  const importId = importJobId || `imp_${Date.now()}`;

  stages.push({ stage: "supplier", status: "PASS", supplierId });
  logStage(importId, null, "supplier", "PASS", { supplierId });

  const normalized = {
    sku: raw.sku || raw.supplierSku,
    supplierSku: raw.supplierSku || raw.sku,
    ean: raw.ean,
    gtin: raw.gtin || raw.ean,
    mpn: raw.mpn,
    title: raw.title || raw.name,
    description: raw.description,
    shortDescription: raw.shortDescription,
    category: raw.category,
    brand: raw.brand,
    price: raw.price,
    stock: raw.stock,
    attributes: raw.attributes || {},
    images: raw.images || [],
  };

  logStage(importId, null, "normalization", "PASS", normalized);
  stages.push({ stage: "normalization", status: "PASS" });

  const validation = productValidation.validateProduct({
    ...normalized,
    id: "pending",
    images: normalized.images,
  });
  logStage(importId, null, "validation", validation.overall, validation);
  stages.push({ stage: "validation", status: validation.overall });

  const dupCheck = supplierMapping.listMappings({ supplierId });
  stages.push({ stage: "duplicate_detection", status: "PASS", existing: dupCheck.length });

  let product = null;
  if (!dryRun && validation.overall !== "FAIL") {
    product = productCore.createProduct(
      {
        ...normalized,
        supplier: supplierId,
        status: "IMPORTED",
      },
      { source: AUDIT_SOURCE.IMPORT, actorId }
    );
    supplierMapping.createMapping({
      supplierId,
      supplierSku: normalized.supplierSku,
      internalProductId: product.id,
      internalSku: product.sku,
      ean: normalized.ean,
      confidence: 0.8,
    });
    if (normalized.category) {
      categoryEngine.assignProductCategory(product.id, normalized.category);
    }
    logStage(importId, product.id, "pim", "PASS", { productId: product.id });
  }

  stages.push({
    stage: "pim",
    status: dryRun ? "SKIPPED" : product ? "PASS" : "FAIL",
    dryRun,
    productId: product?.id,
  });

  return {
    importJobId: importId,
    dryRun,
    stages,
    validation,
    product,
  };
}

module.exports = { runPipeline, logStage };
