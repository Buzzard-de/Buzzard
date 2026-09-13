export {
  listSuppliers,
  getSupplier,
  getSupplierOrThrow,
  updateSupplierStatus,
  getRegistryCount,
} from "./registry";

export { createConnector } from "./connectors/factory";
export { ApiSupplierConnector } from "./connectors/api";
export { XmlSupplierConnector } from "./connectors/xml";
export { CsvSupplierConnector, parseCsvFeed } from "./connectors/csv";
export { ManualSupplierConnector } from "./connectors/manual";

export { applyFieldMapping, validateMappedRecord } from "./fieldMapping";
export { hasCapability, assertCapability, listConfiguredCapabilities } from "./capabilities";
export { withRetry, isRetryableError, computeBackoffDelay } from "./retry";
export { checkRateLimit, handleRateLimitResponse, resetRateLimit } from "./rateLimit";
export { processInBatches, paginateRecords } from "./batch";
export { redactSecrets, sanitizeClientSyncRequest, rejectClientCredentials } from "./security";
export { logSupplierOperation, getSupplierLogs, recordSyncMetrics, clearObservability } from "./observability";
export { computeSupplierReliabilityScore } from "./reliability";
export { runSupplierSyncJob, ingestSupplierFeed } from "./sync";
export { getSupplierEngineAdminOverview } from "./admin";
export {
  createSupplierOrder,
  getSupplierOrder,
  cancelSupplierOrder,
  getSupplierTracking,
  validateSupplierOrderPayload,
} from "./order";
export { classifySupplierError, isClassifiedRetryable } from "./errors";
export {
  getSyncCursor,
  saveSyncCursor,
  clearSyncCursor,
  listSyncCursors,
  resetSyncCursors,
} from "./syncCursor";
export {
  getSupplierRuntimeState,
  updateSupplierRuntimeState,
  resetSupplierRuntimeState,
} from "./state";
export {
  registerCredentialRef,
  getCredentialRef,
  hasConfiguredCredentials,
  resolveCredentials,
  sanitizeCredentialPayload,
  resetCredentialRefs,
} from "./credentials";
export { fetchSupplierTracking, mapSupplierTrackingStatus } from "./tracking";
export { createSupplierReturn, listReturnCapabilities } from "./returns";

export { TEST_SUPPLIER_ID, getTestFeedProducts } from "./fixtures";
export { selectBestSupplierForMarket, selectBestSupplierForOrder } from "./selection";
