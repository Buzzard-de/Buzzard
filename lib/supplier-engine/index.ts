export type {
  ConnectorConfig,
  ConnectorHealthStatus,
  FetchResult,
  HealthCheckResult,
  IngestFeedResult,
  IntegrationType,
  SupplierCapability,
  SupplierCapabilities,
  SupplierConfig,
  SupplierEngineAdminRow,
  SupplierFieldMapping,
  SupplierOfferSyncStatus,
  SupplierOrderRequest,
  SupplierOrderResult,
  SupplierReliabilityScore,
  SupplierStatus,
  SyncJobResult,
  SyncJobType,
  SyncMetrics,
} from "./types";

export { SupplierConnector } from "./connectors/base";
export * from "./service";
