import type {
  ConnectorConfig,
  FetchResult,
  HealthCheckResult,
  SupplierCapabilities,
  SupplierConfig,
} from "../types";
import { assertCapability } from "../capabilities";

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
      throw new Error(result.reason || "CAPABILITY_NOT_CONFIGURED");
    }
  }

  abstract connect(): Promise<{ ok: boolean; message: string }>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  async fetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult> {
    this.checkCapability("productFeed");
    return this.doFetchProducts(options);
  }

  async fetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    this.checkCapability("stockFeed");
    return this.doFetchStock(options);
  }

  async fetchPrices(options?: { skus?: string[] }): Promise<FetchResult> {
    this.checkCapability("priceFeed");
    return this.doFetchPrices(options);
  }

  async fetchOrders(): Promise<FetchResult> {
    this.checkCapability("orderAPI");
    return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "NOT_IMPLEMENTED" };
  }

  async fetchTracking(): Promise<FetchResult> {
    this.checkCapability("trackingAPI");
    return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "NOT_IMPLEMENTED" };
  }

  protected abstract doFetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult>;
  protected abstract doFetchStock(options?: { skus?: string[] }): Promise<FetchResult>;
  protected abstract doFetchPrices(options?: { skus?: string[] }): Promise<FetchResult>;
}
