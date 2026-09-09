import {
  getProduct,
  updateProductSupplierOffer,
  upsertRegistryProduct,
} from "@/lib/product-engine";
import { getSupplier } from "@/lib/supplier-engine/registry";
import {
  getStockRecord,
  resolveFixtureProductId,
  upsertStockRecord,
} from "./registry";
import { createInitialStockRecord, recomputeStockRecord, validateSupplierQuantity } from "./stock";
import { updateMarketAvailabilityForRecord } from "./market";
import { updateChannelAvailabilityForRecord } from "./channel";
import { attachReservedQuantity, getTotalReservedQuantity } from "./reservation";
import { createAuditFromUpdate } from "./audit";
import { emitStockEvent, inferStockEventType } from "./events";
import type { StockSyncResult, StockSyncType, StockUpdateInput, StockUpdateResult } from "./types";

const pricingRecalcQueue = new Set<string>();

export function isPricingRecalculationRequired(productId: string): boolean {
  return pricingRecalcQueue.has(productId);
}

export function consumePricingRecalculationFlag(productId: string): boolean {
  if (pricingRecalcQueue.has(productId)) {
    pricingRecalcQueue.delete(productId);
    return true;
  }
  return false;
}

export function clearPricingRecalcQueue(): void {
  pricingRecalcQueue.clear();
}

/**
 * Process validated supplier stock update.
 * Supplier Integration Engine fetches/parses — Inventory Engine owns stock state.
 */
export function processSupplierStockUpdate(input: StockUpdateInput): StockUpdateResult {
  const supplierOfferId = input.supplierOfferId || input.supplierSku;
  const existing = getStockRecord(input.productId, input.supplierId, supplierOfferId);
  const previousQuantity = existing?.quantity ?? 0;
  const previousStatus = existing?.stockStatus ?? "UNKNOWN";

  if (input.discontinued) {
    return applyStockChange(existing, input, 0, {
      manuallyDiscontinued: true,
      reason: "SUPPLIER_DISCONTINUED",
    });
  }

  const validation = validateSupplierQuantity(input.rawQuantity);
  if (!validation.valid) {
    emitStockEvent({
      type: "STOCK_INVALID",
      productId: input.productId,
      supplierId: input.supplierId,
      supplierOfferId,
      previousQuantity,
      newQuantity: previousQuantity,
      previousStatus,
      newStatus: previousStatus,
      source: input.source,
      metadata: { errors: validation.errors },
    });

    if (existing && validation.errors.includes("MISSING_STOCK")) {
      return { ok: false, errors: validation.errors, pricingRecalculationRequired: false };
    }

    return { ok: false, errors: validation.errors, pricingRecalculationRequired: false };
  }

  const newQuantity = validation.normalizedQuantity ?? 0;

  if (existing?.manuallyDiscontinued) {
    return {
      ok: true,
      record: existing,
      previousQuantity,
      previousStatus,
      pricingRecalculationRequired: false,
    };
  }

  return applyStockChange(existing, input, newQuantity, {
    manuallyDiscontinued: false,
    reason: "SUPPLIER_SYNC",
  });
}

function applyStockChange(
  existing: ReturnType<typeof getStockRecord>,
  input: StockUpdateInput,
  newQuantity: number,
  options: { manuallyDiscontinued: boolean; reason: string }
): StockUpdateResult {
  const supplierOfferId = input.supplierOfferId || input.supplierSku;
  const now = new Date().toISOString();
  const previousQuantity = existing?.quantity ?? 0;
  const previousStatus = existing?.stockStatus ?? "UNKNOWN";

  const supplier = getSupplier(input.supplierId);
  const supportedMarkets = supplier?.supportedMarkets ?? ["DE", "FR", "PL"];

  let record =
    existing ??
    createInitialStockRecord({
      productId: input.productId,
      supplierId: input.supplierId,
      supplierOfferId,
      supplierSku: input.supplierSku,
      quantity: newQuantity,
      ean: input.ean,
      mpn: input.mpn,
      currency: input.currency ?? supplier?.currency ?? "EUR",
      source: input.source,
    });

  record = {
    ...record,
    quantity: newQuantity,
    supplierLastUpdatedAt: input.supplierLastUpdatedAt ?? now,
    lastSyncedAt: now,
    lastSuccessfulSyncAt: now,
    lastSyncFailed: false,
    manuallyDiscontinued: options.manuallyDiscontinued,
    source: input.source,
    ean: input.ean ?? record.ean,
    mpn: input.mpn ?? record.mpn,
  };

  record = attachReservedQuantity(record);
  record = recomputeStockRecord(record);
  record = {
    ...record,
    marketAvailability: updateMarketAvailabilityForRecord(record, supportedMarkets),
    channelAvailability: updateChannelAvailabilityForRecord(record, supportedMarkets[0] ?? "DE"),
  };

  upsertStockRecord(record);
  syncToProductEngine(record);
  pricingRecalcQueue.add(input.productId);

  const eventType = inferStockEventType(previousQuantity, newQuantity, previousStatus, record.stockStatus);
  emitStockEvent({
    type: eventType,
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId,
    previousQuantity,
    newQuantity,
    previousStatus,
    newStatus: record.stockStatus,
    source: input.source,
  });

  createAuditFromUpdate(
    input.productId,
    input.supplierId,
    supplierOfferId,
    previousQuantity,
    newQuantity,
    previousStatus,
    record.stockStatus,
    input.source,
    options.reason,
    input.syncType
  );

  return {
    ok: true,
    record,
    previousQuantity,
    previousStatus,
    pricingRecalculationRequired: previousQuantity !== newQuantity || previousStatus !== record.stockStatus,
  };
}

/** Supplier sync failure — retain last known stock, do NOT zero out. */
export function processSupplierSyncFailure(input: {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  source: string;
  error: string;
}): StockUpdateResult {
  const record = getStockRecord(input.productId, input.supplierId, input.supplierOfferId);
  if (!record) {
    return { ok: false, errors: ["STOCK_RECORD_NOT_FOUND"], pricingRecalculationRequired: false };
  }

  const now = new Date().toISOString();
  const updated = recomputeStockRecord({
    ...record,
    lastSyncedAt: now,
    lastSyncFailed: true,
  });

  const withAvailability = {
    ...updated,
    marketAvailability: updateMarketAvailabilityForRecord(updated, updated.marketAvailability.map((m) => m.marketId)),
    channelAvailability: updateChannelAvailabilityForRecord(updated),
  };

  upsertStockRecord(withAvailability);

  emitStockEvent({
    type: "STOCK_SYNC_FAILED",
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    previousQuantity: record.quantity,
    newQuantity: record.quantity,
    previousStatus: record.stockStatus,
    newStatus: withAvailability.stockStatus,
    source: input.source,
    metadata: { error: input.error },
  });

  return {
    ok: true,
    record: withAvailability,
    previousQuantity: record.quantity,
    previousStatus: record.stockStatus,
    pricingRecalculationRequired: withAvailability.isStale && !record.isStale,
  };
}

function syncToProductEngine(record: ReturnType<typeof getStockRecord> & object): void {
  const product = getProduct(record.productId);
  if (!product) return;

  if (product.status === "DISCONTINUED") return;

  const updated = updateProductSupplierOffer(record.productId, record.supplierId, {
    stock: record.quantity,
  });

  if (updated) {
    upsertRegistryProduct(updated);
  }
}

export async function runInventoryStockSync(
  supplierId: string,
  records: Array<{
    supplierSku: string;
    rawQuantity: unknown;
    ean?: string;
    discontinued?: boolean;
  }>,
  syncType: StockSyncType = "FULL_STOCK_SYNC"
): Promise<StockSyncResult> {
  const startedAt = new Date().toISOString();
  const result: StockSyncResult = {
    syncType,
    supplierId,
    productsProcessed: 0,
    productsUpdated: 0,
    productsFailed: 0,
    pricingRecalculationRequired: [],
    errors: [],
    startedAt,
    completedAt: startedAt,
  };

  for (const rec of records) {
    result.productsProcessed++;
    const productId = resolveFixtureProductId(rec.supplierSku);
    if (!productId) {
      result.productsFailed++;
      result.errors.push({ code: "UNKNOWN_SKU", message: `No product mapping for ${rec.supplierSku}` });
      continue;
    }

    const updateResult = processSupplierStockUpdate({
      productId,
      supplierId,
      supplierOfferId: rec.supplierSku,
      supplierSku: rec.supplierSku,
      rawQuantity: rec.rawQuantity,
      ean: rec.ean,
      source: supplierId,
      discontinued: rec.discontinued,
      syncType,
    });

    if (updateResult.ok) {
      result.productsUpdated++;
      if (updateResult.pricingRecalculationRequired) {
        result.pricingRecalculationRequired.push(productId);
      }
    } else {
      result.productsFailed++;
      result.errors.push({
        productId,
        code: updateResult.errors?.[0] ?? "UPDATE_FAILED",
        message: updateResult.errors?.join(", ") ?? "Update failed",
      });
    }
  }

  result.completedAt = new Date().toISOString();
  return result;
}

export function markOfferDiscontinued(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): StockUpdateResult {
  return processSupplierStockUpdate({
    productId,
    supplierId,
    supplierOfferId,
    supplierSku: supplierOfferId,
    rawQuantity: 0,
    source: "admin",
    discontinued: true,
    syncType: "SINGLE_PRODUCT_STOCK_SYNC",
  });
}

export function pauseOffer(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): StockUpdateResult {
  const record = getStockRecord(productId, supplierId, supplierOfferId);
  if (!record) return { ok: false, errors: ["STOCK_RECORD_NOT_FOUND"], pricingRecalculationRequired: false };

  const updated = recomputeStockRecord({ ...record, manuallyPaused: true });
  const withChannels = {
    ...updated,
    channelAvailability: updateChannelAvailabilityForRecord(updated),
  };
  upsertStockRecord(withChannels);
  return { ok: true, record: withChannels, pricingRecalculationRequired: true };
}

export function resumeOffer(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): StockUpdateResult {
  const record = getStockRecord(productId, supplierId, supplierOfferId);
  if (!record) return { ok: false, errors: ["STOCK_RECORD_NOT_FOUND"], pricingRecalculationRequired: false };
  if (record.manuallyDiscontinued) {
    return { ok: false, errors: ["MANUALLY_DISCONTINUED"], pricingRecalculationRequired: false };
  }

  const updated = recomputeStockRecord({ ...record, manuallyPaused: false });
  const withChannels = {
    ...updated,
    channelAvailability: updateChannelAvailabilityForRecord(updated),
  };
  upsertStockRecord(withChannels);
  return { ok: true, record: withChannels, pricingRecalculationRequired: true };
}

export function getSupplierSelectionStockInfo(
  productId: string,
  supplierId: string,
  supplierOfferId: string
) {
  const record = getStockRecord(productId, supplierId, supplierOfferId);
  if (!record) return null;

  return {
    productId,
    supplierId,
    supplierOfferId,
    availableQuantity: record.availableQuantity,
    saleableQuantity: record.saleableQuantity,
    stockStatus: record.stockStatus,
    isStale: record.isStale,
    lastSuccessfulSyncAt: record.lastSuccessfulSyncAt,
    reservedQuantity: getTotalReservedQuantity(productId, supplierId, supplierOfferId),
    marketAvailability: record.marketAvailability,
  };
}
