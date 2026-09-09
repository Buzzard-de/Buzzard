import {
  getDefaultStaleAfterMs,
  getDefaultStalePolicy,
  getLowStockThreshold,
  getMissingStockPolicy,
  getStockBufferConfig,
  getStalePolicy,
} from "./registry";
import { applyStockBuffer } from "./buffer";
import type {
  StockStatus,
  StockValidationResult,
  SupplierStockRecord,
} from "./types";

export function validateSupplierQuantity(rawQuantity: unknown): StockValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rawQuantity == null || rawQuantity === "") {
    const policy = getMissingStockPolicy();
    if (policy === "ZERO") {
      return { valid: true, normalizedQuantity: 0, stockStatus: "OUT_OF_STOCK", errors, warnings };
    }
    if (policy === "KEEP_LAST_KNOWN") {
      return { valid: false, normalizedQuantity: null, stockStatus: "UNKNOWN", errors: ["MISSING_STOCK"], warnings };
    }
    return { valid: false, normalizedQuantity: null, stockStatus: "UNKNOWN", errors: ["MISSING_STOCK"], warnings };
  }

  if (typeof rawQuantity === "string" && rawQuantity.trim() !== "" && Number.isNaN(Number(rawQuantity))) {
    return {
      valid: false,
      normalizedQuantity: null,
      stockStatus: "UNKNOWN",
      errors: ["INVALID_STOCK"],
      warnings: ["NON_NUMERIC_STOCK"],
    };
  }

  const parsed = Number(rawQuantity);
  if (!Number.isFinite(parsed)) {
    return { valid: false, normalizedQuantity: null, stockStatus: "UNKNOWN", errors: ["INVALID_STOCK"], warnings };
  }

  if (parsed < 0) {
    return { valid: false, normalizedQuantity: null, stockStatus: "UNKNOWN", errors: ["INVALID_STOCK"], warnings: ["NEGATIVE_STOCK"] };
  }

  const normalized = Math.floor(parsed);
  const status = deriveStockStatus(normalized, { manuallyDiscontinued: false, isStale: false });
  return { valid: true, normalizedQuantity: normalized, stockStatus: status, errors, warnings };
}

export function deriveStockStatus(
  quantity: number,
  options: {
    manuallyDiscontinued?: boolean;
    isStale?: boolean;
    isPreorder?: boolean;
    manuallyPaused?: boolean;
  }
): StockStatus {
  if (options.manuallyDiscontinued) return "DISCONTINUED";
  if (options.isStale) return "STALE";
  if (options.isPreorder) return "PREORDER";
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= getLowStockThreshold()) return "LOW_STOCK";
  return "IN_STOCK";
}

export function isStockStale(lastSuccessfulSyncAt: string, staleAfterMs?: number): boolean {
  const threshold = staleAfterMs ?? getDefaultStaleAfterMs();
  const lastSync = new Date(lastSuccessfulSyncAt).getTime();
  if (Number.isNaN(lastSync)) return true;
  return Date.now() - lastSync > threshold;
}

/**
 * Calculate Buzzard saleable quantity.
 * saleableQuantity = max(0, availableQuantity - bufferApplied - reservedQuantity)
 * Buffer is applied to availableQuantity first, then reservations subtracted.
 */
export function calculateSaleableQuantity(options: {
  availableQuantity: number;
  stockBuffer: { type: "absolute" | "percentage"; value: number };
  reservedQuantity: number;
  isStale?: boolean;
  stalePolicy?: "BLOCK_SALE" | "ALLOW_WITH_WARNING" | "KEEP_LAST_KNOWN";
  manuallyDiscontinued?: boolean;
  stockStatus?: StockStatus;
}): number {
  if (options.manuallyDiscontinued || options.stockStatus === "DISCONTINUED") return 0;
  if (options.stockStatus === "OUT_OF_STOCK") return 0;

  if (options.isStale) {
    const policy = options.stalePolicy ?? getDefaultStalePolicy();
    if (policy === "BLOCK_SALE") return 0;
    if (policy === "ALLOW_WITH_WARNING") {
      const afterBuffer = applyStockBuffer(options.availableQuantity, options.stockBuffer);
      return Math.max(0, afterBuffer - options.reservedQuantity);
    }
    // KEEP_LAST_KNOWN — same as fresh for saleable calc
  }

  const afterBuffer = applyStockBuffer(options.availableQuantity, options.stockBuffer);
  return Math.max(0, afterBuffer - options.reservedQuantity);
}

export function recomputeStockRecord(
  record: SupplierStockRecord,
  options?: { categoryId?: string; now?: string }
): SupplierStockRecord {
  const now = options?.now ?? new Date().toISOString();
  const isStale = isStockStale(record.lastSuccessfulSyncAt, record.staleAfterMs);
  const stalePolicy = getStalePolicy(record.supplierId);

  let availableQuantity = record.quantity;
  if (record.manuallyDiscontinued) {
    availableQuantity = 0;
  } else if (isStale && stalePolicy === "BLOCK_SALE") {
    availableQuantity = 0;
  } else if (record.stockStatus === "UNKNOWN" || !record.lastSuccessfulSyncAt) {
    availableQuantity = 0;
  }

  const stockBuffer =
    record.stockBuffer ??
    getStockBufferConfig({ supplierId: record.supplierId, categoryId: options?.categoryId });

  const stockStatus = deriveStockStatus(record.quantity, {
    manuallyDiscontinued: record.manuallyDiscontinued,
    isStale,
    manuallyPaused: record.manuallyPaused,
  });

  const saleableQuantity = calculateSaleableQuantity({
    availableQuantity,
    stockBuffer,
    reservedQuantity: record.reservedQuantity,
    isStale,
    stalePolicy,
    manuallyDiscontinued: record.manuallyDiscontinued,
    stockStatus,
  });

  return {
    ...record,
    availableQuantity,
    stockBuffer,
    stockStatus,
    isStale,
    stalePolicy,
    saleableQuantity,
    updatedAt: now,
  };
}

export function createInitialStockRecord(input: {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  quantity: number;
  ean?: string;
  mpn?: string;
  currency?: string;
  source: string;
  categoryId?: string;
}): SupplierStockRecord {
  const now = new Date().toISOString();
  const stockBuffer = getStockBufferConfig({
    supplierId: input.supplierId,
    categoryId: input.categoryId,
  });

  const base: SupplierStockRecord = {
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    supplierSku: input.supplierSku,
    ean: input.ean,
    mpn: input.mpn,
    quantity: input.quantity,
    availableQuantity: input.quantity,
    stockStatus: deriveStockStatus(input.quantity, { manuallyDiscontinued: false, isStale: false }),
    supplierLastUpdatedAt: now,
    lastSyncedAt: now,
    lastSuccessfulSyncAt: now,
    source: input.source,
    currency: input.currency ?? "EUR",
    marketAvailability: [],
    channelAvailability: [],
    stockBuffer,
    saleableQuantity: 0,
    reservedQuantity: 0,
    staleAfterMs: getDefaultStaleAfterMs(),
    isStale: false,
    stalePolicy: getDefaultStalePolicy(),
    manuallyDiscontinued: false,
    manuallyPaused: false,
    lastSyncFailed: false,
    createdAt: now,
    updatedAt: now,
  };

  return recomputeStockRecord(base, { categoryId: input.categoryId });
}
