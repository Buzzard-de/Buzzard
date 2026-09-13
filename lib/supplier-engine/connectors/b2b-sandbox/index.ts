import { SupplierConnector } from "../base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../../types";
import type { LiveSupplierProfile } from "../../liveSupplier/types";
import { resolveSupplierAuth } from "../../auth";
import {
  canUseProductionNetwork,
  createSupplierHttpTransport,
  resolveConnectorEnvironment,
  type SupplierTransport,
} from "../../network";
import { checkRateLimit } from "../../rateLimit";
import { advancePagination, buildPaginationQuery, type PaginationState } from "../../pagination";
import { getSyncCursor, saveSyncCursor } from "../../syncCursor";
import { parseSupplierFeedBody } from "./parser";
import { normalizeB2bSandboxRecord } from "./mapping";
import { profileToConnectorConfig, resolveB2bProfile } from "./connectorConfig";
import {
  chunkSkus,
  isInterCarsProfile,
  preprocessInterCarsPrice,
  preprocessInterCarsStock,
} from "./interCarsAdapter";

export class B2bSandboxSupplierConnector extends SupplierConnector {
  private profile: LiveSupplierProfile | null;
  private transport: SupplierTransport | null = null;
  private injectedTransport: SupplierTransport | null = null;

  constructor(
    supplier: SupplierConfig,
    connectorConfig: ConnectorConfig = {},
    options?: { transport?: SupplierTransport }
  ) {
    const profile = resolveB2bProfile(supplier);
    super(
      supplier,
      profile ? { ...profileToConnectorConfig(profile), ...connectorConfig } : connectorConfig,
      "b2b-sandbox"
    );
    this.profile = profile;
    this.injectedTransport = options?.transport || null;
  }

  setTransport(transport: SupplierTransport): void {
    this.injectedTransport = transport;
    this.transport = transport;
  }

  private getProfile(): LiveSupplierProfile {
    if (!this.profile) throw new Error("LIVE_SUPPLIER_PROFILE_MISSING");
    return this.profile;
  }

  private usesLiveNetwork(): boolean {
    const profile = this.profile;
    if (!profile) return false;
    const environment = resolveConnectorEnvironment(profile.environment);
    return canUseProductionNetwork(environment);
  }

  private getTransport(): SupplierTransport {
    if (this.injectedTransport) return this.injectedTransport;
    if (this.transport) return this.transport;
    const profile = this.getProfile();
    this.transport = createSupplierHttpTransport(profile.baseUrl, profile.allowedEndpoints);
    return this.transport;
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    const profile = this.getProfile();
    const base = profile.baseUrl.replace(/\/$/, "");
    const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private authHeaders(): Record<string, string> {
    const profile = this.getProfile();
    const auth = resolveSupplierAuth({
      ...this.connectorConfig,
      secretsRef: profile.secretsRef,
      authentication: profile.authentication,
    }).headers;
    return { ...(profile.requestHeaders || {}), ...auth };
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    const profile = this.getProfile();
    if (!this.usesLiveNetwork()) {
      return { ok: true, message: "B2B sandbox connector configured (network disabled — config only)" };
    }
    const transport = this.getTransport();
    const healthPath = profile.endpoints.health || "/health";
    await transport.request({
      url: this.buildUrl(healthPath),
      headers: this.authHeaders(),
      supplierId: this.supplierId,
      operation: "connect",
      timeoutMs: this.connectorConfig.timeoutMs,
    });
    return { ok: true, message: "B2B sandbox connector connected (read-only)" };
  }

  async disconnect(): Promise<void> {
    this.transport = null;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const profile = this.getProfile();
    if (!this.usesLiveNetwork()) {
      return {
        status: "DEGRADED",
        latencyMs: Date.now() - start,
        productsFetched: 0,
        productsUpdated: 0,
        productsFailed: 0,
        connector: "b2b-sandbox",
        supplierId: this.supplierId,
        lastError: "NETWORK_DISABLED",
      };
    }
    try {
      const transport = this.getTransport();
      const res = await transport.request({
        url: this.buildUrl(profile.endpoints.health || "/health"),
        headers: this.authHeaders(),
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
        connector: "b2b-sandbox",
        supplierId: this.supplierId,
        lastError: res.ok ? undefined : `HTTP_${res.status}`,
      };
    } catch (e) {
      return {
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        productsFetched: 0,
        productsUpdated: 0,
        productsFailed: 0,
        connector: "b2b-sandbox",
        supplierId: this.supplierId,
        lastError: e instanceof Error ? e.message : "HEALTH_CHECK_FAILED",
      };
    }
  }

  protected async doFetchProducts(options?: { cursor?: string; limit?: number }): Promise<FetchResult> {
    const profile = this.getProfile();
    const rate = checkRateLimit(this.supplierId, this.config.rateLimit);
    if (!rate.allowed) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "RATE_LIMITED" };
    }

    if (!this.usesLiveNetwork()) {
      return {
        ok: false,
        records: [],
        total: 0,
        fetchedAt: new Date().toISOString(),
        error: "NETWORK_DISABLED",
        dryRun: true,
      };
    }

    const pagination: PaginationState = {
      mode: profile.pagination?.mode || "cursor",
      pageSize: options?.limit || profile.pagination?.pageSize || 100,
      page: profile.pagination?.mode === "pageNumber" ? Number(getSyncCursor(this.supplierId, "incremental")?.cursor || 0) : undefined,
      pageParam: profile.pagination?.pageParam,
      pageSizeParam: profile.pagination?.pageSizeParam,
      cursor: options?.cursor || getSyncCursor(this.supplierId, "incremental")?.cursor,
    };

    const transport = this.getTransport();
    const query = buildPaginationQuery(pagination);
    const res = await transport.request({
      url: this.buildUrl(profile.endpoints.products || "/products", query),
      headers: this.authHeaders(),
      supplierId: this.supplierId,
      operation: "fetchProducts",
      timeoutMs: this.connectorConfig.timeoutMs,
    });

    const parsed = parseSupplierFeedBody(res.body, profile.feedFormat || "json");
    if (!parsed.ok) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
    }

    const records = parsed.records.map((raw) => normalizeB2bSandboxRecord(raw, profile));
    const page = advancePagination(pagination, {
      records,
      hasNextPage: parsed.hasNextPage,
      cursor: res.headers["x-next-cursor"],
      nextPageToken: res.headers["x-next-page-token"],
      linkHeader: res.headers.link,
    });
    const nextCursor =
      page.nextCursor ||
      (profile.pagination?.mode === "pageNumber" && page.hasMore
        ? String((pagination.page ?? 0) + 1)
        : undefined);

    if (nextCursor) {
      saveSyncCursor(this.supplierId, { cursor: nextCursor, lastModified: new Date().toISOString() }, "incremental");
    }

    return {
      ok: res.ok,
      records,
      total: records.length,
      cursor: nextCursor,
      fetchedAt: new Date().toISOString(),
    };
  }

  protected async doFetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    const profile = this.getProfile();
    if (!this.usesLiveNetwork()) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "NETWORK_DISABLED", dryRun: true };
    }

    const transport = this.getTransport();
    const targetSkus = options?.skus?.filter(Boolean) || [];
    const allRecords: Record<string, unknown>[] = [];

    if (isInterCarsProfile(profile) && targetSkus.length) {
      for (const batch of chunkSkus(targetSkus, 100)) {
        const res = await transport.request({
          url: this.buildUrl(profile.endpoints.stock || "/stock", { sku: batch.join(",") }),
          headers: this.authHeaders(),
          supplierId: this.supplierId,
          operation: "fetchStock",
          timeoutMs: this.connectorConfig.timeoutMs,
        });
        const parsed = parseSupplierFeedBody(res.body, profile.feedFormat || "json");
        if (!parsed.ok) {
          return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
        }
        for (const raw of parsed.records) {
          const mapped = preprocessInterCarsStock(raw);
          allRecords.push({
            supplier_sku: mapped.supplierSku,
            stock: mapped.stock,
            stock_status: mapped.stock_status,
            discontinued: mapped.discontinued,
            backorder: mapped.backorder,
            lead_time: mapped.lead_time,
            updated_at: new Date().toISOString(),
          });
        }
      }
      return { ok: true, records: allRecords, total: allRecords.length, fetchedAt: new Date().toISOString() };
    }

    const res = await transport.request({
      url: this.buildUrl(profile.endpoints.stock || "/stock"),
      headers: this.authHeaders(),
      supplierId: this.supplierId,
      operation: "fetchStock",
      timeoutMs: this.connectorConfig.timeoutMs,
    });

    const parsed = parseSupplierFeedBody(res.body, profile.feedFormat || "json");
    if (!parsed.ok) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
    }

    let records = parsed.records.map((raw) => {
      const mapped = isInterCarsProfile(profile) ? preprocessInterCarsStock(raw) : normalizeB2bSandboxRecord(raw, profile);
      return {
        supplier_sku: mapped.supplierSku || mapped.supplier_sku,
        stock: mapped.stock,
        stock_status: mapped.stock === 0 ? "unavailable" : "available",
        updated_at: new Date().toISOString(),
      };
    });

    if (targetSkus.length) {
      records = records.filter((r) => targetSkus.includes(String(r.supplier_sku)));
    }

    return { ok: res.ok, records, total: records.length, fetchedAt: new Date().toISOString() };
  }

  protected async doFetchPrices(options?: { skus?: string[] }): Promise<FetchResult> {
    const profile = this.getProfile();
    if (!this.usesLiveNetwork()) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: "NETWORK_DISABLED", dryRun: true };
    }

    const transport = this.getTransport();
    const targetSkus = options?.skus?.filter(Boolean) || [];
    const allRecords: Record<string, unknown>[] = [];

    if (isInterCarsProfile(profile) && targetSkus.length) {
      for (const batch of chunkSkus(targetSkus, 100)) {
        const body = JSON.stringify({
          lines: batch.map((sku) => ({ sku, quantity: 1 })),
        });
        const res = await transport.request({
          url: this.buildUrl(profile.endpoints.prices || "/prices"),
          method: "POST",
          body,
          headers: { ...this.authHeaders(), "Content-Type": "application/json" },
          supplierId: this.supplierId,
          operation: "fetchPrices",
          timeoutMs: this.connectorConfig.timeoutMs,
        });
        const parsed = parseSupplierFeedBody(res.body, profile.feedFormat || "json");
        if (!parsed.ok) {
          return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
        }
        for (const raw of parsed.records) {
          const mapped = preprocessInterCarsPrice(raw, profile.currency);
          const priceObj = mapped.supplier_price as { amount?: number; currency?: string; includesVat?: boolean } | undefined;
          allRecords.push({
            supplier_sku: mapped.supplierSku,
            supplier_price: {
              amount: priceObj?.amount ?? mapped.supplierPrice,
              currency: priceObj?.currency || profile.currency,
              includesVat: profile.priceIncludesVat === true,
            },
            updated_at: new Date().toISOString(),
          });
        }
      }
      return { ok: true, records: allRecords, total: allRecords.length, fetchedAt: new Date().toISOString() };
    }

    const res = await transport.request({
      url: this.buildUrl(profile.endpoints.prices || "/prices"),
      headers: this.authHeaders(),
      supplierId: this.supplierId,
      operation: "fetchPrices",
      timeoutMs: this.connectorConfig.timeoutMs,
    });

    const parsed = parseSupplierFeedBody(res.body, profile.feedFormat || "json");
    if (!parsed.ok) {
      return { ok: false, records: [], total: 0, fetchedAt: new Date().toISOString(), error: parsed.reason };
    }

    let records = parsed.records.map((raw) => {
      const mapped = isInterCarsProfile(profile)
        ? preprocessInterCarsPrice(raw, profile.currency)
        : normalizeB2bSandboxRecord(raw, profile);
      const priceObj = mapped.supplier_price as { amount?: number; currency?: string } | undefined;
      return {
        supplier_sku: mapped.supplierSku,
        supplier_price: {
          amount: priceObj?.amount ?? mapped.supplierPrice,
          currency: priceObj?.currency || profile.currency,
          includesVat: profile.priceIncludesVat === true,
        },
        updated_at: new Date().toISOString(),
      };
    });

    if (targetSkus.length) {
      records = records.filter((r) => targetSkus.includes(String(r.supplier_sku)));
    }

    return { ok: res.ok, records, total: records.length, fetchedAt: new Date().toISOString() };
  }
}
