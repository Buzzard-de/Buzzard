import { SupplierConnector } from "./base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../types";
import { paginateRecords } from "../batch";
import { checkRateLimit } from "../rateLimit";
import { getTestFeedProducts } from "../fixtures";

export class ApiSupplierConnector extends SupplierConnector {
  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}) {
    super(supplier, connectorConfig, "api");
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    this.checkCapability("api");
    // No real network — dry-run only
    return { ok: true, message: "API connector ready (dry-run, no live credentials)" };
  }

  async disconnect(): Promise<void> {
    /* no-op */
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const products = getTestFeedProducts(this.supplierId);
    return {
      status: products.length > 0 ? "HEALTHY" : "DEGRADED",
      latencyMs: Date.now() - start,
      lastSuccessfulSync: new Date().toISOString(),
      productsFetched: products.length,
      productsUpdated: 0,
      productsFailed: 0,
      connector: "api",
      supplierId: this.supplierId,
    };
  }

  protected async doFetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult> {
    this.checkCapability("api");
    const rate = checkRateLimit(this.supplierId, this.config.rateLimit);
    if (!rate.allowed) {
      return {
        ok: false,
        records: [],
        total: 0,
        fetchedAt: new Date().toISOString(),
        error: "RATE_LIMITED",
      };
    }

    const all = getTestFeedProducts(this.supplierId);
    const page = paginateRecords(all, {
      batchSize: options?.limit ?? 50,
      cursor: options?.cursor,
    });

    return {
      ok: true,
      records: page.records as Record<string, unknown>[],
      total: page.total,
      cursor: page.cursor,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    const all = getTestFeedProducts(this.supplierId);
    const filtered = options?.skus?.length
      ? all.filter((r) => options.skus!.includes(String(r.article_number || r.supplierSku)))
      : all;
    return {
      ok: true,
      records: filtered.map((r) => ({
        supplier_sku: r.article_number || r.supplierSku,
        stock: r.stock_qty ?? r.stock,
        updated_at: new Date().toISOString(),
      })),
      total: filtered.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchPrices(options?: { skus?: string[] }): Promise<FetchResult> {
    const all = getTestFeedProducts(this.supplierId);
    const filtered = options?.skus?.length
      ? all.filter((r) => options.skus!.includes(String(r.article_number || r.supplierSku)))
      : all;
    return {
      ok: true,
      records: filtered.map((r) => ({
        supplier_sku: r.article_number || r.supplierSku,
        supplier_price: { amount: r.price_net ?? r.supplierPrice, currency: this.config.currency },
        updated_at: new Date().toISOString(),
      })),
      total: filtered.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }
}
