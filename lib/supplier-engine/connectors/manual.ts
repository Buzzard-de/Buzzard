import { SupplierConnector } from "./base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../types";

export class ManualSupplierConnector extends SupplierConnector {
  private manualRecords: Record<string, unknown>[] = [];

  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}) {
    super(supplier, connectorConfig, "manual");
  }

  setManualRecords(records: Record<string, unknown>[]): void {
    this.manualRecords = records;
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Manual connector ready for admin imports" };
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: "HEALTHY",
      latencyMs: 0,
      productsFetched: this.manualRecords.length,
      productsUpdated: 0,
      productsFailed: 0,
      connector: "manual",
      supplierId: this.supplierId,
    };
  }

  protected async doFetchProducts(): Promise<FetchResult> {
    return {
      ok: true,
      records: [...this.manualRecords],
      total: this.manualRecords.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchStock(): Promise<FetchResult> {
    return {
      ok: true,
      records: this.manualRecords.map((r) => ({
        supplier_sku: r.supplier_sku || r.supplierSku,
        stock: r.stock ?? r.stock_qty,
      })),
      total: this.manualRecords.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchPrices(): Promise<FetchResult> {
    return {
      ok: true,
      records: this.manualRecords.map((r) => ({
        supplier_sku: r.supplier_sku || r.supplierSku,
        supplier_price: r.supplier_price || { amount: r.price_net || r.supplierPrice, currency: this.config.currency },
      })),
      total: this.manualRecords.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }
}
