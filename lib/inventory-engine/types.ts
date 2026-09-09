/** Supplier-reported stock status — NOT Buzzard-owned inventory. */
export type StockStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PREORDER"
  | "DISCONTINUED"
  | "UNKNOWN"
  | "STALE";

export type StalePolicy = "BLOCK_SALE" | "ALLOW_WITH_WARNING" | "KEEP_LAST_KNOWN";

export type MissingStockPolicy = "UNKNOWN" | "ZERO" | "KEEP_LAST_KNOWN";

export type StockBufferType = "absolute" | "percentage";

export type ChannelAvailabilityStatus =
  | "ACTIVE"
  | "PAUSED"
  | "OUT_OF_STOCK"
  | "STALE"
  | "MARKET_UNSUPPORTED"
  | "SUPPLIER_UNAVAILABLE"
  | "DISCONTINUED"
  | "REVIEW_REQUIRED";

export type MarketAvailabilityStatus = "ACTIVE" | "DISABLED" | "REVIEW_REQUIRED" | "OUT_OF_STOCK" | "STALE";

export type ReservationStatus = "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED" | "CANCELLED";

export type StockSyncType = "FULL_STOCK_SYNC" | "INCREMENTAL_STOCK_SYNC" | "SINGLE_PRODUCT_STOCK_SYNC";

export type StockEventType =
  | "STOCK_INCREASED"
  | "STOCK_DECREASED"
  | "OUT_OF_STOCK"
  | "BACK_IN_STOCK"
  | "STOCK_CHANGED"
  | "STOCK_STALE"
  | "STOCK_SYNC_FAILED"
  | "STOCK_INVALID"
  | "DISCONTINUED"
  | "OFFER_REACTIVATED";

export type InventoryChannel =
  | "direct"
  | "amazon"
  | "ebay"
  | "kaufland"
  | "allegro"
  | "bol"
  | "cdiscount"
  | "otto";

export interface StockBufferConfig {
  type: StockBufferType;
  value: number;
}

export interface MarketAvailabilityEntry {
  marketId: string;
  status: MarketAvailabilityStatus;
  reason?: string;
  updatedAt: string;
}

export interface ChannelAvailabilityEntry {
  channel: InventoryChannel;
  status: ChannelAvailabilityStatus;
  reason?: string;
  updatedAt: string;
}

/**
 * Canonical supplier-stock record.
 * quantity = supplier-reported; NOT Buzzard-owned warehouse inventory.
 */
export interface SupplierStockRecord {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  ean?: string;
  mpn?: string;

  /** Supplier-reported quantity — source of truth from supplier feed. */
  quantity: number;
  /** Validated supplier-available quantity (0 if invalid/stale/discontinued). */
  availableQuantity: number;
  stockStatus: StockStatus;

  supplierLastUpdatedAt: string;
  lastSyncedAt: string;
  lastSuccessfulSyncAt: string;
  source: string;
  currency: string;

  marketAvailability: MarketAvailabilityEntry[];
  channelAvailability: ChannelAvailabilityEntry[];

  stockBuffer: StockBufferConfig;
  /** Buzzard saleable quantity after buffer and reservations. */
  saleableQuantity: number;
  reservedQuantity: number;

  staleAfterMs: number;
  isStale: boolean;
  stalePolicy: StalePolicy;

  manuallyDiscontinued: boolean;
  manuallyPaused: boolean;
  lastSyncFailed: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface StockValidationResult {
  valid: boolean;
  normalizedQuantity: number | null;
  stockStatus: StockStatus;
  errors: string[];
  warnings: string[];
}

export interface StockUpdateInput {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  rawQuantity: unknown;
  ean?: string;
  mpn?: string;
  currency?: string;
  source: string;
  supplierLastUpdatedAt?: string;
  discontinued?: boolean;
  syncType?: StockSyncType;
}

export interface StockUpdateResult {
  ok: boolean;
  record?: SupplierStockRecord;
  previousQuantity?: number;
  previousStatus?: StockStatus;
  pricingRecalculationRequired: boolean;
  errors?: string[];
}

export interface StockReservation {
  reservationId: string;
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  quantity: number;
  orderId?: string;
  status: ReservationStatus;
  /** Buzzard order reservation — NOT a supplier-confirmed hold. */
  isSupplierConfirmed: false;
  createdAt: string;
  expiresAt: string;
}

export interface ReservationResult {
  ok: boolean;
  reservation?: StockReservation;
  reason?: string;
}

export interface StockEvent {
  eventId: string;
  type: StockEventType;
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  previousQuantity?: number;
  newQuantity?: number;
  previousStatus?: StockStatus;
  newStatus?: StockStatus;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface StockAuditEntry {
  auditId: string;
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  oldQuantity: number;
  newQuantity: number;
  oldStatus: StockStatus;
  newStatus: StockStatus;
  source: string;
  syncJob?: string;
  timestamp: string;
  reason: string;
}

export interface SupplierSelectionStockInfo {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  availableQuantity: number;
  saleableQuantity: number;
  stockStatus: StockStatus;
  isStale: boolean;
  lastSuccessfulSyncAt: string;
  reservedQuantity: number;
  marketAvailability: MarketAvailabilityEntry[];
}

export interface InventoryEngineAdminRow {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  supplierQuantity: number;
  saleableQuantity: number;
  reservedQuantity: number;
  stockBuffer: string;
  stockStatus: StockStatus;
  lastSuccessfulSync: string;
  isStale: boolean;
  marketAvailability: string;
  channelAvailability: string;
  lastStockEvent: string;
}

export interface StockSyncResult {
  syncType: StockSyncType;
  supplierId: string;
  productsProcessed: number;
  productsUpdated: number;
  productsFailed: number;
  pricingRecalculationRequired: string[];
  errors: Array<{ productId?: string; code: string; message: string }>;
  startedAt: string;
  completedAt: string;
}
