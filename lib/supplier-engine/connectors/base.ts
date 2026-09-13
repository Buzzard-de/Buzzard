import type {
  ConnectorConfig,
  ConnectorOperationResult,
  FetchResult,
  HealthCheckResult,
  SupplierCapabilities,
  SupplierConfig,
  SupplierOrderRequest,
  SupplierReturnStatusRecord,
  SupplierTrackingRecord,
} from "../types";
import { assertCapability } from "../capabilities";
import { CAPABILITY_NOT_SUPPORTED, capabilityNotSupportedFetch, capabilityNotSupportedOperation } from "./capabilityResult";
import { isSupplierOrderNetworkEnabled } from "../network";

export abstract class SupplierConnector {
  readonly supplierId: string;
  readonly connectorType: string;
  protected config: SupplierConfig;
  protected connectorConfig: ConnectorConfig;

  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}, connectorType = "base") {
    this.supplierId = supplier.supplierId;
    this.config = supplier;
    this.connectorConfig = connectorConfig;
    this.connectorType = connectorType;
  }

  protected checkCapability(cap: keyof SupplierCapabilities): void {
    const result = assertCapability(this.config.capabilities, cap as never);
    if (!result.allowed) {
      throw new Error(result.reason || CAPABILITY_NOT_SUPPORTED);
    }
  }

  protected supports(cap: keyof SupplierCapabilities): boolean {
    return assertCapability(this.config.capabilities, cap as never).allowed;
  }

  abstract connect(): Promise<{ ok: boolean; message: string }>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  async fetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult> {
    if (!this.supports("productFeed")) return capabilityNotSupportedFetch();
    return this.doFetchProducts(options);
  }

  async fetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    if (!this.supports("stockFeed")) return capabilityNotSupportedFetch();
    return this.doFetchStock(options);
  }

  async fetchPrices(options?: { skus?: string[] }): Promise<FetchResult> {
    if (!this.supports("priceFeed")) return capabilityNotSupportedFetch();
    return this.doFetchPrices(options);
  }

  async createOrder(request: SupplierOrderRequest): Promise<ConnectorOperationResult> {
    if (!this.supports("orderAPI") && !this.supports("createOrder")) {
      return capabilityNotSupportedOperation();
    }
    if (!isSupplierOrderNetworkEnabled()) {
      return {
        ok: true,
        dryRun: true,
        errorCode: "ORDER_NETWORK_DISABLED",
        data: { status: "PREPARED_NOT_SENT", orderId: request.orderId },
      };
    }
    return this.doCreateOrder(request);
  }

  async getOrderStatus(supplierOrderId: string): Promise<ConnectorOperationResult> {
    if (!this.supports("orderAPI") && !this.supports("orderStatus")) {
      return capabilityNotSupportedOperation();
    }
    return this.doGetOrderStatus(supplierOrderId);
  }

  async getTracking(supplierOrderId: string): Promise<ConnectorOperationResult<SupplierTrackingRecord>> {
    if (!this.supports("trackingAPI") && !this.supports("tracking")) {
      return capabilityNotSupportedOperation<SupplierTrackingRecord>();
    }
    return this.doGetTracking(supplierOrderId);
  }

  async createReturn(payload: {
    orderId: string;
    supplierOrderId: string;
    lines: Array<{ supplierSku: string; quantity: number; reason?: string }>;
    returnType: "REFUND" | "CREDIT" | "REPLACEMENT";
  }): Promise<ConnectorOperationResult> {
    if (!this.supports("returnsAPI")) {
      return capabilityNotSupportedOperation();
    }
    if (!isSupplierOrderNetworkEnabled()) {
      return {
        ok: true,
        dryRun: true,
        errorCode: "ORDER_NETWORK_DISABLED",
        data: { status: "PREPARED_NOT_SENT" },
      };
    }
    return this.doCreateReturn(payload);
  }

  async getReturnStatus(rmaId: string): Promise<ConnectorOperationResult<SupplierReturnStatusRecord>> {
    if (!this.supports("returnsAPI")) {
      return capabilityNotSupportedOperation<SupplierReturnStatusRecord>();
    }
    return this.doGetReturnStatus(rmaId);
  }

  protected abstract doFetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult>;
  protected abstract doFetchStock(options?: { skus?: string[] }): Promise<FetchResult>;
  protected abstract doFetchPrices(options?: { skus?: string[] }): Promise<FetchResult>;

  protected async doCreateOrder(_request: SupplierOrderRequest): Promise<ConnectorOperationResult> {
    return capabilityNotSupportedOperation({ data: { status: "NOT_IMPLEMENTED" } });
  }

  protected async doGetOrderStatus(_supplierOrderId: string): Promise<ConnectorOperationResult> {
    return capabilityNotSupportedOperation();
  }

  protected async doGetTracking(_supplierOrderId: string): Promise<ConnectorOperationResult<SupplierTrackingRecord>> {
    return capabilityNotSupportedOperation<SupplierTrackingRecord>();
  }

  protected async doCreateReturn(_payload: {
    orderId: string;
    supplierOrderId: string;
    lines: Array<{ supplierSku: string; quantity: number; reason?: string }>;
    returnType: "REFUND" | "CREDIT" | "REPLACEMENT";
  }): Promise<ConnectorOperationResult> {
    return capabilityNotSupportedOperation();
  }

  protected async doGetReturnStatus(_rmaId: string): Promise<ConnectorOperationResult<SupplierReturnStatusRecord>> {
    return capabilityNotSupportedOperation<SupplierReturnStatusRecord>();
  }
}
