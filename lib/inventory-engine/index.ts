export type {
  ChannelAvailabilityEntry,
  ChannelAvailabilityStatus,
  InventoryChannel,
  InventoryEngineAdminRow,
  MarketAvailabilityEntry,
  MarketAvailabilityStatus,
  MissingStockPolicy,
  ReservationResult,
  ReservationStatus,
  StalePolicy,
  StockAuditEntry,
  StockBufferConfig,
  StockBufferType,
  StockEvent,
  StockEventType,
  StockReservation,
  StockStatus,
  StockSyncResult,
  StockSyncType,
  StockUpdateInput,
  StockUpdateResult,
  StockValidationResult,
  SupplierSelectionStockInfo,
  SupplierStockRecord,
} from "./types";

export {
  stockRecordKey,
  getStockRecord,
  upsertStockRecord,
  listStockRecords,
  clearStockRegistry,
  getDefaultStaleAfterMs,
  getDefaultStalePolicy,
  getStalePolicy,
  getMissingStockPolicy,
  getLowStockThreshold,
  getStockBufferConfig,
  getReservationTtlMs,
  getMaxReservationQuantity,
  getSupportedChannels,
  resolveFixtureProductId,
  getFixtureProductMapping,
} from "./registry";

export { applyStockBuffer, describeStockBuffer } from "./buffer";
export {
  validateSupplierQuantity,
  deriveStockStatus,
  isStockStale,
  calculateSaleableQuantity,
  recomputeStockRecord,
  createInitialStockRecord,
} from "./stock";
export { computeMarketAvailability, updateMarketAvailabilityForRecord } from "./market";
export { computeChannelAvailability, updateChannelAvailabilityForRecord } from "./channel";
export {
  createStockReservation,
  releaseReservation,
  consumeReservation,
  cancelReservation,
  getActiveReservations,
  getTotalReservedQuantity,
  getReservation,
  listReservations,
  clearAllReservations,
  attachReservedQuantity,
} from "./reservation";
export {
  processSupplierStockUpdate,
  processSupplierSyncFailure,
  runInventoryStockSync,
  markOfferDiscontinued,
  pauseOffer,
  resumeOffer,
  getSupplierSelectionStockInfo,
  isPricingRecalculationRequired,
  consumePricingRecalculationFlag,
  clearPricingRecalcQueue,
} from "./sync";
export { emitStockEvent, getStockEvents, clearStockEvents, getLastStockEvent, inferStockEventType } from "./events";
export { recordStockAudit, getStockAuditLog, clearStockAuditLog, createAuditFromUpdate } from "./audit";
export {
  isServerOnlyInventoryField,
  rejectClientInventoryModification,
  validateInventoryRequest,
  sanitizeClientInventoryPatch,
} from "./security";
export { buildInventoryAdminRow, getInventoryAdminOverview } from "./admin";
export {
  FIXTURE_SKU_MAP,
  STOCK_TEST_SCENARIOS,
  buildStockUpdateFixture,
  getAllFixtureProductIds,
  TEST_SUPPLIER_ID,
} from "./test-fixtures";
