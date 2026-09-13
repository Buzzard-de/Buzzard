import type { IntegrationType, SyncJobResult, SyncJobType } from "./types";
import { createConnector } from "./connectors/factory";
import { getSupplierOrThrow } from "./registry";
import { applyFieldMapping, validateMappedRecord } from "./fieldMapping";
import { processInBatches } from "./batch";
import { withRetry } from "./retry";
import { classifySupplierError } from "./errors";
import { logSupplierOperation, recordSyncMetrics } from "./observability";
import { getSyncCursor, saveSyncCursor, type SupplierSyncMode } from "./syncCursor";
import {
  markSyncCompleted,
  tryAcquireSupplierSyncLock,
  releaseSupplierSyncLock,
} from "./state";
import { bootstrapSupplierEnginePersistence } from "./bootstrap";
import { getSupplierPersistence } from "./persistence";
import { recordSupplierHealthSuccess, recordSupplierHealthFailure } from "./health";
import { recordSupplierEngineAudit } from "./audit";
import { isSupplierSelectable } from "./registry";
import {
  getProduct,
  updateProductSupplierOffer,
  upsertRegistryProduct,
  ingestSupplierProduct,
  addSupplierOffer,
  createSupplierOffer,
  recalculatePricingFromBestOffer,
  listRegistryProducts,
} from "@/lib/product-engine";
import { processSupplierStockUpdate, resolveFixtureProductId } from "@/lib/inventory-engine";

export interface SyncOptions {
  integrationType?: IntegrationType;
  batchSize?: number;
  jobType?: SyncJobType;
}

function buildIdempotencyKey(
  supplierId: string,
  jobType: SyncJobType,
  cursor?: string,
  batchSize?: number
): string {
  return `${supplierId}:${jobType}:${cursor || "start"}:${batchSize || 50}`;
}

export async function runSupplierSyncJob(
  supplierId: string,
  options: SyncOptions = {}
): Promise<SyncJobResult> {
  bootstrapSupplierEnginePersistence();
  const startedAt = new Date().toISOString();
  const jobId = `sync_${supplierId}_${Date.now()}`;
  const supplier = getSupplierOrThrow(supplierId);
  if (!isSupplierSelectable(supplierId)) {
    return {
      jobId,
      supplierId,
      jobType: options.jobType ?? "FULL",
      status: "FAILED",
      productsFetched: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      stockUpdates: 0,
      priceUpdates: 0,
      errors: [{ code: "SUPPLIER_DISABLED", message: "Supplier is disabled" }],
      startedAt,
      completedAt: startedAt,
    };
  }

  const integrationType = options.integrationType ?? supplier.integrationTypes[0] ?? "api";
  const jobType = options.jobType ?? "FULL";
  const connector = createConnector(supplier, integrationType);

  const lock = tryAcquireSupplierSyncLock(supplierId, jobId);
  if (!lock.acquired) {
    return {
      jobId,
      supplierId,
      jobType,
      status: "FAILED",
      productsFetched: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      stockUpdates: 0,
      priceUpdates: 0,
      errors: [{ code: "SYNC_IN_PROGRESS", message: lock.reason || "Sync already running" }],
      startedAt,
      completedAt: startedAt,
    };
  }

  recordSupplierEngineAudit({
    supplierId,
    action: "supplier.sync.started",
    correlationId: jobId,
    metadata: { jobType, integrationType },
  });

  const result: SyncJobResult = {
    jobId,
    supplierId,
    jobType,
    status: "COMPLETED",
    productsFetched: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsFailed: 0,
    stockUpdates: 0,
    priceUpdates: 0,
    errors: [],
    startedAt,
    completedAt: startedAt,
  };

  const syncStart = Date.now();
  const seenSkus = new Set<string>();

  try {
    await connector.connect();

    if (jobType === "STOCK_ONLY") {
      await syncStockOnly(connector, supplier, result);
    } else if (jobType === "PRICE_ONLY") {
      await syncPriceOnly(connector, supplier, result);
    } else if (jobType === "INCREMENTAL") {
      await syncIncrementalFeed(connector, supplier, result, options.batchSize ?? 50, seenSkus);
    } else {
      await syncFullFeed(connector, supplier, result, options.batchSize ?? 50, seenSkus);
    }

    const health = await connector.healthCheck();
    const syncDuration = Date.now() - syncStart;
    if (result.status === "FAILED") {
      recordSupplierHealthFailure(supplierId, {
        errorCode: result.errors[0]?.code,
        responseTimeMs: syncDuration,
        rateLimited: result.errors[0]?.code === "RATE_LIMITED",
      });
      recordSupplierEngineAudit({
        supplierId,
        action: "supplier.sync.failed",
        correlationId: jobId,
        metadata: { jobType, errorCode: result.errors[0]?.code },
      });
    } else {
      recordSupplierHealthSuccess(supplierId, {
        responseTimeMs: syncDuration,
        operation: jobType,
      });
      recordSupplierEngineAudit({
        supplierId,
        action: "supplier.sync.completed",
        correlationId: jobId,
        metadata: {
          jobType,
          status: result.status,
          productsFetched: result.productsFetched,
        },
      });
    }

    markSyncCompleted(supplierId, {
      status: result.status === "FAILED" ? "FAILED" : result.status === "PARTIAL" ? "PARTIAL" : "COMPLETED",
      healthStatus: health.status,
      error: result.errors[0]?.message,
      errorCode: result.errors[0]?.code,
      metrics: {
        productsProcessed: result.productsFetched,
        productsAccepted: result.productsCreated + result.productsUpdated,
        productsRejected: result.productsFailed,
        offersUpdated: result.productsUpdated,
        stockUpdated: result.stockUpdates,
        priceUpdated: result.priceUpdates,
      },
    });
  } catch (e) {
    const classified = classifySupplierError({
      message: e instanceof Error ? e.message : "Unknown sync error",
      code: (e as { code?: string })?.code,
    });
    result.status = "FAILED";
    result.errors.push({
      code: classified.code,
      message: classified.message,
    });
    recordSupplierHealthFailure(supplierId, {
      errorCode: classified.code,
      rateLimited: classified.code === "RATE_LIMITED",
    });
    recordSupplierEngineAudit({
      supplierId,
      action: "supplier.sync.failed",
      correlationId: jobId,
      metadata: { jobType, errorCode: classified.code },
    });
    markSyncCompleted(supplierId, {
      status: "FAILED",
      healthStatus: "UNHEALTHY",
      error: classified.message,
      errorCode: classified.code,
    });
  } finally {
    releaseSupplierSyncLock(supplierId, jobId);
  }

  if (jobType === "FULL" && seenSkus.size > 0) {
    deactivateMissingOffers(supplier.supplierId, seenSkus, result);
  }

  result.completedAt = new Date().toISOString();
  recordSyncMetrics({
    syncDurationMs: Date.now() - syncStart,
    productsFetched: result.productsFetched,
    productsCreated: result.productsCreated,
    productsUpdated: result.productsUpdated,
    productsFailed: result.productsFailed,
    stockUpdates: result.stockUpdates,
    priceUpdates: result.priceUpdates,
    apiErrors: result.errors.length,
  });

  logSupplierOperation({
    supplierId,
    connector: integrationType,
    operation: jobType,
    durationMs: Date.now() - syncStart,
    status: result.productsFailed > 0 ? "PARTIAL" : result.status === "FAILED" ? "FAILURE" : "SUCCESS",
    records: result.productsFetched,
    error: result.errors[0]?.message,
    correlationId: jobId,
    errorCode: result.errors[0]?.code,
  });

  return result;
}

async function syncFullFeed(
  connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult,
  batchSize: number,
  seenSkus: Set<string>
): Promise<void> {
  const fetchResult = await withRetry(() => connector.fetchProducts({ limit: 1000 }));
  if (!fetchResult.ok) {
    result.status = "FAILED";
    result.errors.push({ code: "FETCH_FAILED", message: fetchResult.error || "Fetch failed" });
    return;
  }

  result.productsFetched = fetchResult.records.length;
  const pendingCursor = fetchResult.cursor;

  await processRecords(connector, supplier, result, fetchResult.records, seenSkus, batchSize, {
    jobType: "FULL",
    pendingCursor,
    syncMode: "full",
  });

  if (result.status !== "FAILED" && pendingCursor) {
    const saved = saveSyncCursor(supplier.supplierId, { cursor: pendingCursor }, "full");
    result.checkpoint = saved.cursor;
  }

  if (result.productsFailed > 0 && result.productsCreated + result.productsUpdated > 0) {
    result.status = "PARTIAL";
  }
}

async function syncIncrementalFeed(
  connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult,
  batchSize: number,
  seenSkus: Set<string>
): Promise<void> {
  const cursor = getSyncCursor(supplier.supplierId, "incremental");
  const fetchResult = await withRetry(() =>
    connector.fetchProducts({
      limit: 500,
      cursor: cursor?.cursor,
    })
  );

  if (!fetchResult.ok) {
    result.status = "FAILED";
    result.errors.push({ code: "FETCH_FAILED", message: fetchResult.error || "Incremental fetch failed" });
    return;
  }

  result.productsFetched = fetchResult.records.length;
  const pendingCursor = fetchResult.cursor;

  const idempotencyKey = buildIdempotencyKey(
    supplier.supplierId,
    "INCREMENTAL",
    cursor?.cursor || "start",
    batchSize
  );
  const persistence = getSupplierPersistence();
  if (persistence && !persistence.claimIdempotencyKey(idempotencyKey, supplier.supplierId)) {
    result.status = "COMPLETED";
    result.errors.push({
      code: "IDEMPOTENT_REPLAY",
      message: "Batch already processed for current cursor",
    });
    return;
  }

  await processRecords(connector, supplier, result, fetchResult.records, seenSkus, batchSize, {
    jobType: "INCREMENTAL",
    pendingCursor,
    syncMode: "incremental",
  });

  if (result.status === "FAILED") {
    return;
  }

  if (pendingCursor) {
    const saved = saveSyncCursor(
      supplier.supplierId,
      { cursor: pendingCursor, lastModified: new Date().toISOString() },
      "incremental"
    );
    result.checkpoint = saved.cursor;
  }

  if (result.productsFailed > 0 && result.productsCreated + result.productsUpdated > 0) {
    result.status = "PARTIAL";
  }
}

async function processRecords(
  _connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult,
  records: Record<string, unknown>[],
  seenSkus: Set<string>,
  batchSize: number,
  checkpoint?: { jobType: SyncJobType; pendingCursor?: string; syncMode: SupplierSyncMode }
): Promise<void> {
  if (records.length === 0) {
    if (checkpoint?.pendingCursor && result.status !== "FAILED") {
      saveSyncCursor(
        supplier.supplierId,
        { cursor: checkpoint.pendingCursor, lastModified: new Date().toISOString() },
        checkpoint.syncMode
      );
    }
    return;
  }

  await processInBatches(records, async (batch) => {
    for (const raw of batch) {
      try {
        const mapped = applyFieldMapping(raw as Record<string, unknown>, supplier.fieldMapping);
        const sku = String(mapped.supplierSku || mapped.supplier_sku || "");
        if (sku) seenSkus.add(sku);

        const fieldErrors = validateMappedRecord(mapped);
        if (fieldErrors.length) {
          result.productsFailed++;
          result.errors.push({ record: sku || "unknown", code: fieldErrors[0], message: fieldErrors[0] });
          continue;
        }

        const ingest = ingestSupplierProduct({
          raw: mapped,
          supplierId: supplier.supplierId,
          sourceType: supplier.integrationTypes.includes("api") ? "API" : "CSV",
        });

        if (ingest.product) {
          const dup = ingest.duplicate;
          if (dup?.match && dup.existingProductId) {
            const existing = getProduct(dup.existingProductId);
            if (existing) {
              const offer = createSupplierOffer({
                supplierId: supplier.supplierId,
                supplierSku: sku,
                supplierEan: String(mapped.ean || ""),
                supplierPrice: Number(mapped.supplierPrice || mapped.purchase_price || 0),
                currency: supplier.currency,
                stock: Number(mapped.stock || 0),
                source: supplier.supplierId,
                sourceType: "API",
              });
              upsertRegistryProduct(addSupplierOffer(existing, offer));
              result.productsUpdated++;
            }
          } else if (ingest.ok) {
            result.productsCreated++;
          } else {
            result.productsUpdated++;
          }
        } else {
          result.productsFailed++;
        }
      } catch (e) {
        result.productsFailed++;
        result.errors.push({
          code: "RECORD_ERROR",
          message: e instanceof Error ? e.message : "Record processing failed",
        });
      }
    }
  }, batchSize);
}

function deactivateMissingOffers(
  supplierId: string,
  seenSkus: Set<string>,
  result: SyncJobResult
): void {
  for (const product of listRegistryProducts()) {
    for (const offer of product.supplierOffers) {
      if (offer.supplierId !== supplierId) continue;
      if (seenSkus.has(offer.supplierSku)) continue;
      if (offer.stock <= 0) continue;

      const updated = updateProductSupplierOffer(product.productId, supplierId, { stock: 0 });
      if (updated) {
        upsertRegistryProduct(recalculatePricingFromBestOffer(updated));
        result.productsUpdated++;
      }
    }
  }
}

async function syncStockOnly(
  connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult
): Promise<void> {
  const stockResult = await connector.fetchStock();
  result.productsFetched = stockResult.records.length;

  for (const record of stockResult.records) {
    const sku = String(record.supplier_sku || record.supplierSku || "");
    const product = findProductBySupplierSku(sku);
    const productId = product?.productId ?? resolveFixtureProductId(sku);
    if (!productId) continue;

    const invResult = processSupplierStockUpdate({
      productId,
      supplierId: supplier.supplierId,
      supplierOfferId: sku,
      supplierSku: sku,
      rawQuantity: record.stock ?? record.stock_qty,
      ean: record.ean_code ? String(record.ean_code) : undefined,
      source: supplier.supplierId,
      syncType: "INCREMENTAL_STOCK_SYNC",
    });

    if (invResult.ok) {
      result.stockUpdates++;
      result.productsUpdated++;
    } else {
      result.productsFailed++;
    }
  }
}

async function syncPriceOnly(
  connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult
): Promise<void> {
  const priceResult = await connector.fetchPrices();
  result.productsFetched = priceResult.records.length;

  for (const record of priceResult.records) {
    const sku = String(record.supplier_sku || "");
    const priceObj = record.supplier_price as { amount?: number; currency?: string } | undefined;
    const price = Number(priceObj?.amount ?? record.supplierPrice ?? 0);
    const product = findProductBySupplierSku(sku);
    if (!product) continue;

    let updated = updateProductSupplierOffer(product.productId, supplier.supplierId, {
      supplierPrice: price,
      currency: priceObj?.currency || supplier.currency,
    });
    if (updated) {
      updated = recalculatePricingFromBestOffer(updated);
      upsertRegistryProduct(updated);
      result.priceUpdates++;
      result.productsUpdated++;
    }
  }
}

function findProductBySupplierSku(supplierSku: string) {
  return listRegistryProducts().find((p) =>
    p.supplierOffers.some((o) => o.supplierSku === supplierSku)
  );
}

export async function ingestSupplierFeed(
  supplierId: string,
  options: SyncOptions = {}
): Promise<ReturnType<typeof runSupplierSyncJob>> {
  return runSupplierSyncJob(supplierId, options);
}
