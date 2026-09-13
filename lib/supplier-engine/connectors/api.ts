import { SupplierConnector } from "./base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../types";
import { paginateRecords } from "../batch";
import { checkRateLimit } from "../rateLimit";
import { getTestFeedProducts } from "../fixtures";
import { resolveSupplierAuth } from "../auth";
import {
  canUseProductionNetwork,
  createSupplierHttpTransport,
  resolveConnectorEnvironment,
  safeParseJson,
  type SupplierTransport,
} from "../network";
import { MockSupplierTransport, buildMockTransportFixtures } from "../network/mockTransport";

export class ApiSupplierConnector extends SupplierConnector {
  private transport: SupplierTransport | null = null;

  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}) {
    super(supplier, connectorConfig, "api");
  }

  private getTransport(): SupplierTransport | null {
    if (this.transport) return this.transport;
    const environment = resolveConnectorEnvironment(this.connectorConfig.environment);
    if (!canUseProductionNetwork(environment)) return null;
    if (this.connectorConfig.baseUrl?.includes("supplier-mock.example")) {
      this.transport = new MockSupplierTransport(buildMockTransportFixtures());
      return this.transport;
    }
    this.transport = createSupplierHttpTransport(
      this.connectorConfig.baseUrl,
      this.connectorConfig.allowedEndpoints
    );
    return this.transport;
  }

  private useLiveNetwork(): boolean {
    const environment = resolveConnectorEnvironment(this.connectorConfig.environment);
    return canUseProductionNetwork(environment) && Boolean(this.connectorConfig.baseUrl);
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    if (!this.supports("api") && !this.supports("productFeed")) {
      return { ok: false, message: "CAPABILITY_NOT_SUPPORTED" };
    }
    if (!this.useLiveNetwork()) {
      return { ok: true, message: "API connector ready (dry-run, no live credentials)" };
    }
    const auth = resolveSupplierAuth({
      ...this.connectorConfig,
      secretsRef: this.connectorConfig.secretsRef || this.config.secretsRef,
    });
    if (!auth.configured) {
      return { ok: false, message: "AUTH_FAILED: credentials not configured" };
    }
    const transport = this.getTransport();
    if (!transport) return { ok: false, message: "NETWORK_DISABLED" };
    const healthUrl = `${this.connectorConfig.baseUrl?.replace(/\/$/, "")}/health`;
    await transport.request({
      url: healthUrl,
      method: "GET",
      headers: auth.headers,
      supplierId: this.supplierId,
      operation: "connect",
      timeoutMs: this.connectorConfig.timeoutMs,
    });
    return { ok: true, message: "API connector connected" };
  }

  async disconnect(): Promise<void> {
    this.transport = null;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (this.useLiveNetwork()) {
      try {
        const auth = resolveSupplierAuth({
          ...this.connectorConfig,
          secretsRef: this.connectorConfig.secretsRef || this.config.secretsRef,
        });
        const transport = this.getTransport();
        if (transport && this.connectorConfig.baseUrl) {
          const res = await transport.request({
            url: `${this.connectorConfig.baseUrl.replace(/\/$/, "")}/health`,
            headers: auth.headers,
            supplierId: this.supplierId,
            operation: "healthCheck",
            timeoutMs: this.connectorConfig.timeoutMs,
          });
          return {
            status: res.ok ? "HEALTHY" : "DEGRADED",
            latencyMs: Date.now() - start,
            productsFetched: 0,
            productsUpdated: 0,
            productsFailed: 0,
            connector: "api",
            supplierId: this.supplierId,
            lastError: res.ok ? undefined : `HTTP_${res.status}`,
          };
        }
      } catch (e) {
        return {
          status: "UNHEALTHY",
          latencyMs: Date.now() - start,
          productsFetched: 0,
          productsUpdated: 0,
          productsFailed: 0,
          connector: "api",
          supplierId: this.supplierId,
          lastError: e instanceof Error ? e.message : "HEALTH_CHECK_FAILED",
        };
      }
    }

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

    if (this.useLiveNetwork()) {
      return this.fetchProductsViaNetwork(options);
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

  private async fetchProductsViaNetwork(options?: { cursor?: string; limit?: number }): Promise<FetchResult> {
    const transport = this.getTransport();
    if (!transport || !this.connectorConfig.baseUrl) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "NETWORK_DISABLED" };
    }
    const auth = resolveSupplierAuth({
      ...this.connectorConfig,
      secretsRef: this.connectorConfig.secretsRef || this.config.secretsRef,
    });
    const url = new URL(`${this.connectorConfig.baseUrl.replace(/\/$/, "")}/products`);
    if (options?.cursor) url.searchParams.set("cursor", options.cursor);
    if (options?.limit) url.searchParams.set("limit", String(options.limit));

    const res = await transport.request({
      url: url.toString(),
      headers: auth.headers,
      supplierId: this.supplierId,
      operation: "fetchProducts",
      timeoutMs: this.connectorConfig.timeoutMs,
    });

    const parsed = safeParseJson(res.body);
    if (!parsed.ok) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
    }
    const data = parsed.data as { products?: Record<string, unknown>[] };
    const records = data.products || [];
    return {
      ok: res.ok,
      records,
      total: records.length,
      cursor: options?.cursor,
      fetchedAt: new Date().toISOString(),
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
      dryRun: !this.useLiveNetwork(),
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
      dryRun: !this.useLiveNetwork(),
    };
  }
}
