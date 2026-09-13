export type SupplierStatus =
  | "DISCOVERED"
  | "TESTING"
  | "CONNECTED"
  | "ACTIVE"
  | "PAUSED"
  | "DISABLED";

export type IntegrationType = "api" | "xml" | "csv" | "manual" | "template" | "b2b-sandbox";

export type SupplierConnectorEnvironment = "MOCK" | "SANDBOX" | "PRODUCTION";

export type SupplierAuthType = "API_KEY" | "BASIC_AUTH" | "OAUTH2" | "TOKEN" | "CUSTOM" | "NONE";

export type ConnectionTestStatus =
  | "CONNECTED"
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "ENDPOINT_INVALID"
  | "CAPABILITY_NOT_SUPPORTED"
  | "NETWORK_DISABLED"
  | "CREDENTIALS_MISSING";

export type SupplierCapability =
  | "productFeed"
  | "stockFeed"
  | "priceFeed"
  | "orderAPI"
  | "shippingAPI"
  | "trackingAPI"
  | "returnsAPI"
  | "webhook"
  | "dropshipping"
  | "whiteLabel"
  | "blindShipping"
  | "api"
  | "xml"
  | "csv";

export type OrderCapability =
  | "CREATE_ORDER"
  | "CANCEL_ORDER"
  | "ORDER_STATUS"
  | "TRACKING"
  | "RETURN"
  | "REFUND"
  | "CREDIT"
  | "REPLACEMENT";

export type SyncJobType = "FULL" | "INCREMENTAL" | "STOCK_ONLY" | "PRICE_ONLY";

export type ConnectorHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";

export type SupplierOfferSyncStatus = "ACTIVE" | "INACTIVE";

export interface SupplierCapabilities {
  productFeed?: boolean;
  stockFeed?: boolean;
  priceFeed?: boolean;
  orderAPI?: boolean;
  shippingAPI?: boolean;
  trackingAPI?: boolean;
  returnsAPI?: boolean;
  webhook?: boolean;
  dropshipping?: boolean;
  whiteLabel?: boolean;
  blindShipping?: boolean;
  api?: boolean;
  xml?: boolean;
  csv?: boolean;
  /** Explicit order execution capabilities */
  createOrder?: boolean;
  cancelOrder?: boolean;
  orderStatus?: boolean;
  tracking?: boolean;
  returnAuthorization?: boolean;
  refund?: boolean;
  credit?: boolean;
  replacement?: boolean;
}

export interface SupplierFieldMapping {
  [supplierField: string]: string;
}

export interface SupplierConfig {
  supplierId: string;
  name: string;
  displayName?: string;
  legalName?: string;
  country: string;
  region: string;
  status: SupplierStatus;
  integrationTypes: IntegrationType[];
  currency: string;
  supportedMarkets: string[];
  supportedCategories: string[];
  capabilities: SupplierCapabilities;
  fieldMapping: SupplierFieldMapping;
  rateLimit?: { requestsPerMinute: number };
  /** Server-only reference — never sent to client */
  secretsRef?: string;
  /** Config-driven live supplier profile (#333) — server-only */
  connectorProfile?: import("./liveSupplier/types").LiveSupplierProfile;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorConfig {
  baseUrl?: string;
  endpointRef?: string;
  environment?: SupplierConnectorEnvironment;
  authentication?: "none" | "api_key" | "bearer" | "basic" | "oauth2" | "token" | "custom";
  authType?: SupplierAuthType;
  headers?: Record<string, string>;
  timeoutMs?: number;
  rateLimit?: { requestsPerMinute: number; maxConcurrent?: number };
  pagination?: { pageSize: number; cursorField?: string; mode?: "page" | "offset" | "cursor" | "nextPageToken" | "linkHeader" };
  allowedEndpoints?: string[];
  /** Server-only — never exposed to client */
  secretsRef?: string;
}

export interface ConnectorOperationResult<T = unknown> {
  ok: boolean;
  dryRun?: boolean;
  error?: string;
  errorCode?: string;
  data?: T;
}

export interface SupplierTrackingRecord {
  carrier: string;
  trackingNumber: string;
  status: string;
  timestamp: string;
}

export interface SupplierReturnStatusRecord {
  rmaId: string;
  status: string;
  returnType?: string;
  timestamp: string;
}

export interface FetchResult<T = Record<string, unknown>> {
  ok: boolean;
  records: T[];
  total: number;
  cursor?: string;
  fetchedAt: string;
  dryRun?: boolean;
  error?: string;
}

export interface HealthCheckResult {
  status: ConnectorHealthStatus;
  latencyMs: number;
  lastSuccessfulSync?: string;
  lastError?: string;
  productsFetched: number;
  productsUpdated: number;
  productsFailed: number;
  connector: string;
  supplierId: string;
}

export interface SyncJobResult {
  jobId: string;
  supplierId: string;
  jobType: SyncJobType;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  productsFetched: number;
  productsCreated: number;
  productsUpdated: number;
  productsFailed: number;
  stockUpdates: number;
  priceUpdates: number;
  errors: Array<{ record?: string; code: string; message: string }>;
  startedAt: string;
  completedAt: string;
  checkpoint?: string;
}

export interface IngestFeedResult {
  ok: boolean;
  supplierId: string;
  stages: Array<{ stage: string; status: "PASS" | "FAIL" | "WARN" }>;
  sync: Partial<SyncJobResult>;
  products: Array<{ productId?: string; action: "CREATE" | "UPDATE" | "SKIP" | "FAIL"; error?: string }>;
}

export interface SupplierReliabilityMetrics {
  uptime: number;
  syncSuccessRate: number;
  orderSuccessRate: number;
  cancellationRate: number;
  stockAccuracy: number;
  deliveryPerformance: number;
}

export interface SupplierReliabilityScore {
  score: number;
  metrics: SupplierReliabilityMetrics;
  sampleSize: number;
  computedAt: string;
}

export interface SupplierEngineAdminRow {
  supplierId: string;
  name: string;
  country: string;
  integrationTypes: string;
  status: SupplierStatus;
  capabilities: string;
  orderCapabilities: string;
  supportedMarkets: string[];
  lastSync: string;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  syncStatus: string;
  health: ConnectorHealthStatus;
  reliabilityScore: number;
  products: number;
  errors: number;
  credentialsConfigured: boolean;
}

export interface SupplierOrderRequest {
  supplierId: string;
  orderId: string;
  lines: Array<{ supplierSku: string; quantity: number; unitPrice: number }>;
  shippingAddress: Record<string, string>;
  dropshipping?: boolean;
  whiteLabel?: boolean;
  blindShipping?: boolean;
}

export interface SupplierOrderResult {
  ok: boolean;
  dryRun: boolean;
  supplierOrderId?: string;
  status: string;
  message: string;
}

export interface SyncMetrics {
  syncDurationMs: number;
  productsFetched: number;
  productsCreated: number;
  productsUpdated: number;
  productsFailed: number;
  stockUpdates: number;
  priceUpdates: number;
  apiErrors: number;
}
