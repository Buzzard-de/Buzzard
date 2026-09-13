import { SupplierConnector } from "../base";
import type {
  ConnectorConfig,
  ConnectorOperationResult,
  FetchResult,
  HealthCheckResult,
  SupplierConfig,
  SupplierOrderRequest,
  SupplierReturnStatusRecord,
  SupplierTrackingRecord,
} from "../../types";
import { capabilityNotSupportedOperation } from "../capabilityResult";

/**
 * Canonical template connector — demonstrates production contract surface.
 * No real supplier credentials or endpoints.
 */
export class TemplateSupplierConnector extends SupplierConnector {
  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}) {
    super(supplier, connectorConfig, "template");
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Template connector ready (dry-run contract demo)" };
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: "HEALTHY",
      latencyMs: 1,
      productsFetched: 0,
      productsUpdated: 0,
      productsFailed: 0,
      connector: "template",
      supplierId: this.supplierId,
    };
  }

  protected async doFetchProducts(): Promise<FetchResult> {
    return {
      ok: true,
      records: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchStock(): Promise<FetchResult> {
    return { ok: true, records: [], total: 0, fetchedAt: new Date().toISOString(), dryRun: true };
  }

  protected async doFetchPrices(): Promise<FetchResult> {
    return { ok: true, records: [], total: 0, fetchedAt: new Date().toISOString(), dryRun: true };
  }

  protected async doCreateOrder(request: SupplierOrderRequest): Promise<ConnectorOperationResult> {
    return {
      ok: true,
      dryRun: true,
      data: { supplierOrderId: `TEMPLATE-ORD-${request.orderId}`, status: "PREPARED_NOT_SENT" },
    };
  }

  protected async doGetOrderStatus(supplierOrderId: string): Promise<ConnectorOperationResult> {
    return { ok: true, dryRun: true, data: { supplierOrderId, status: "DRY_RUN" } };
  }

  protected async doGetTracking(supplierOrderId: string): Promise<ConnectorOperationResult<SupplierTrackingRecord>> {
    return {
      ok: true,
      dryRun: true,
      data: {
        carrier: "TEMPLATE_CARRIER",
        trackingNumber: `TRK-${supplierOrderId.slice(-6)}`,
        status: "IN_TRANSIT",
        timestamp: new Date().toISOString(),
      },
    };
  }

  protected async doCreateReturn(): Promise<ConnectorOperationResult> {
    return { ok: true, dryRun: true, data: { rmaId: `TEMPLATE-RMA-${Date.now()}`, status: "PREPARED_NOT_SENT" } };
  }

  protected async doGetReturnStatus(rmaId: string): Promise<ConnectorOperationResult<SupplierReturnStatusRecord>> {
    return {
      ok: true,
      dryRun: true,
      data: { rmaId, status: "DRY_RUN", timestamp: new Date().toISOString() },
    };
  }
}
