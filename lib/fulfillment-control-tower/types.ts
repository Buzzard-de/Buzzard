export type ReconciliationLevel = "PASS" | "WARNING" | "MISMATCH" | "CRITICAL";

export type IncidentSeverity = "INFO" | "WARNING" | "MISMATCH" | "CRITICAL";

export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type IncidentCategory =
  | "ORDER"
  | "INVENTORY"
  | "SUPPLIER"
  | "SUPPLIER_ORDER"
  | "PRICE"
  | "TRACKING"
  | "MARKETPLACE"
  | "RETURN"
  | "SECURITY"
  | "SYSTEM";

export type SupplierOrderClassification = "SANDBOX" | "LIVE" | "UNKNOWN";

export type FulfillmentOperationalStatus =
  | "HEALTHY"
  | "WARNING"
  | "MISMATCH"
  | "CRITICAL"
  | "UNKNOWN";

export interface FulfillmentStateView {
  order: string;
  inventory: string;
  supplier: string;
  supplierOrder: string;
  shipment: string;
  tracking: string;
  returns: string;
}

export interface FulfillmentOperationalView {
  fulfillmentId: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  marketId: string;
  channel: string;
  supplierId: string;
  supplierSku: string;
  productId: string;
  quantity: number;
  inventoryReservationId?: string;
  supplierOrderId?: string;
  supplierOrderStatus: string;
  supplierOrderClassification: SupplierOrderClassification;
  orderStatus: string;
  fulfillmentStatus: string;
  inventoryStatus: string;
  priceSnapshotId?: string;
  trackingStatus: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  lastKnownSupplierState?: string;
  supplierHealth: string;
  marketplaceId?: string;
  marketplaceOrderId?: string;
  returnStatus: string;
  refundStatus: string;
  correlationId?: string;
  idempotencyKey?: string;
  operationalStatus: FulfillmentOperationalStatus;
  stateView: FulfillmentStateView;
  lastReconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationFinding {
  checkId: string;
  category: IncidentCategory;
  level: ReconciliationLevel;
  code: string;
  message: string;
}

export interface FulfillmentReconciliationResult {
  fulfillmentId: string;
  orderId: string;
  supplierId: string;
  overallLevel: ReconciliationLevel;
  findings: ReconciliationFinding[];
  incidentFingerprints: string[];
  incidentsCreated?: number;
}

export interface FulfillmentIncident {
  incidentId: string;
  fingerprint: string;
  fulfillmentId: string;
  orderId: string;
  supplierId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  code: string;
  message: string;
  detectedAt: string;
  resolvedAt?: string;
  status: IncidentStatus;
  correlationId?: string;
  resolutionNote?: string;
  resolutionActor?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ReconciliationRunRecord {
  runId: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
  checkedFulfillments: number;
  passed: number;
  warnings: number;
  mismatches: number;
  critical: number;
  incidentsCreated: number;
  incidentsResolved: number;
  durationMs: number;
  errors: string[];
}

export interface FulfillmentControlTowerDashboard {
  totalFulfillments: number;
  healthy: number;
  warning: number;
  mismatch: number;
  critical: number;
  openIncidents: number;
  suppliersAffected: number;
  ordersAffected: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  lastReconciliationRun?: ReconciliationRunRecord;
}

export interface FulfillmentControlTowerFilter {
  supplierId?: string;
  orderId?: string;
  status?: FulfillmentOperationalStatus;
  severity?: IncidentSeverity;
  marketplaceId?: string;
  category?: IncidentCategory;
  dateFrom?: string;
  dateTo?: string;
}

export interface FulfillmentControlTowerDetail {
  fulfillment: FulfillmentOperationalView;
  reconciliation?: FulfillmentReconciliationResult;
  incidents: FulfillmentIncident[];
  audit: Array<Record<string, unknown>>;
}
