import type { IntegrationType, SyncJobResult, SyncJobType } from "./types";
import { createConnector } from "./connectors/factory";
import { getSupplierOrThrow } from "./registry";
import { applyFieldMapping, validateMappedRecord } from "./fieldMapping";
import { processInBatches } from "./batch";
import { withRetry } from "./retry";
import { logSupplierOperation, recordSyncMetrics } from "./observability";
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

export async function runSupplierSyncJob(
  supplierId: string,
  options: SyncOptions = {}
): Promise<SyncJobResult> {
  const startedAt = new Date().toISOString();
  const jobId = `sync_${supplierId}_${Date.now()}`;
  const supplier = getSupplierOrThrow(supplierId);
  const integrationType = options.integrationType ?? supplier.integrationTypes[0] ?? "api";
  const jobType = options.jobType ?? "FULL";
  const connector = createConnector(supplier, integrationType);

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

  try {
    await connector.connect();

    if (jobType === "STOCK_ONLY") {
      await syncStockOnly(connector, supplier, result);
    } else if (jobType === "PRICE_ONLY") {
      await syncPriceOnly(connector, supplier, result);
    } else {
      await syncFullFeed(connector, supplier, result, options.batchSize ?? 50);
    }

    await connector.healthCheck();
  } catch (e) {
    result.status = "FAILED";
    result.errors.push({
      code: "SYNC_FAILED",
      message: e instanceof Error ? e.message : "Unknown sync error",
    });
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
  });

  return result;
}

async function syncFullFeed(
  connector: ReturnType<typeof createConnector>,
  supplier: ReturnType<typeof getSupplierOrThrow>,
  result: SyncJobResult,
  batchSize: number
): Promise<void> {
  const fetchResult = await withRetry(() => connector.fetchProducts({ limit: 1000 }));
  if (!fetchResult.ok) {
    result.status = "FAILED";
    result.errors.push({ code: "FETCH_FAILED", message: fetchResult.error || "Fetch failed" });
    return;
  }

  result.productsFetched = fetchResult.records.length;

  await processInBatches(fetchResult.records, async (batch) => {
    for (const raw of batch) {
      try {
        const mapped = applyFieldMapping(raw as Record<string, unknown>, supplier.fieldMapping);
        const fieldErrors = validateMappedRecord(mapped);
        if (fieldErrors.length) {
          result.productsFailed++;
          result.errors.push({ record: String(mapped.supplierSku), code: fieldErrors[0], message: fieldErrors[0] });
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
                supplierSku: String(mapped.supplierSku || mapped.supplier_sku),
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

  if (result.productsFailed > 0 && result.productsCreated + result.productsUpdated > 0) {
    result.status = "PARTIAL";
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
