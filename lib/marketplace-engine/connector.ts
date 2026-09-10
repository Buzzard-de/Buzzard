import { checkRateLimit } from "@/lib/supplier-engine/rateLimit";
import { withRetry } from "@/lib/supplier-engine/retry";
import { getMarketplace, hasCapability } from "./registry";
import type {
  ConnectorResult,
  ListingPayload,
  MarketplaceConnectorContext,
  MarketplaceDefinition,
} from "./types";

export interface MarketplaceConnector {
  marketplaceId: string;
  connect(): Promise<ConnectorResult<{ status: string }>>;
  disconnect(): Promise<ConnectorResult<{ status: string }>>;
  healthCheck(): Promise<ConnectorResult<{ latencyMs: number; healthy: boolean }>>;
  createListing(payload: ListingPayload): Promise<ConnectorResult<{ marketplaceListingId: string }>>;
  updateListing(
    marketplaceListingId: string,
    payload: Partial<ListingPayload>
  ): Promise<ConnectorResult<{ marketplaceListingId: string }>>;
  pauseListing(marketplaceListingId: string): Promise<ConnectorResult<{ status: string }>>;
  deleteListing(marketplaceListingId: string): Promise<ConnectorResult<{ status: string }>>;
  updatePrice(
    marketplaceListingId: string,
    price: number,
    currency: string
  ): Promise<ConnectorResult<{ price: number; currency: string }>>;
  updateStock(
    marketplaceListingId: string,
    stock: number
  ): Promise<ConnectorResult<{ stock: number }>>;
  fetchOrders(since?: string): Promise<ConnectorResult<{ orders: unknown[] }>>;
  fetchOrder(marketplaceOrderId: string): Promise<ConnectorResult<{ order: unknown }>>;
  acknowledgeOrder(marketplaceOrderId: string): Promise<ConnectorResult<{ acknowledged: boolean }>>;
  createShipment(input: {
    marketplaceOrderId: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
  }): Promise<ConnectorResult<{ shipmentId: string }>>;
  updateTracking(
    shipmentId: string,
    trackingNumber: string,
    trackingUrl?: string
  ): Promise<ConnectorResult<{ updated: boolean }>>;
  fetchReturns(since?: string): Promise<ConnectorResult<{ returns: unknown[] }>>;
  fetchRefunds(since?: string): Promise<ConnectorResult<{ refunds: unknown[] }>>;
}

export class DryRunMarketplaceConnector implements MarketplaceConnector {
  marketplaceId: string;
  private connected = false;

  constructor(marketplaceId: string) {
    this.marketplaceId = marketplaceId;
  }

  private ensureMarketplace(): MarketplaceDefinition {
    const mp = getMarketplace(this.marketplaceId);
    if (!mp) throw new Error(`MARKETPLACE_NOT_FOUND:${this.marketplaceId}`);
    return mp;
  }

  private dryRunOk<T>(data: T): ConnectorResult<T> {
    return { ok: true, dryRun: true, data };
  }

  async connect(): Promise<ConnectorResult<{ status: string }>> {
    this.ensureMarketplace();
    this.connected = true;
    return this.dryRunOk({ status: "CONNECTED_DRY_RUN" });
  }

  async disconnect(): Promise<ConnectorResult<{ status: string }>> {
    this.connected = false;
    return this.dryRunOk({ status: "DISCONNECTED_DRY_RUN" });
  }

  async healthCheck(): Promise<ConnectorResult<{ latencyMs: number; healthy: boolean }>> {
    this.ensureMarketplace();
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 1));
    return this.dryRunOk({ latencyMs: Date.now() - start, healthy: true });
  }

  async createListing(payload: ListingPayload): Promise<ConnectorResult<{ marketplaceListingId: string }>> {
    if (!hasCapability(this.marketplaceId, "productListing")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED", errorMessage: "productListing" };
    }
    const rate = checkRateLimit(this.marketplaceId, { requestsPerMinute: 120 });
    if (!rate.allowed) {
      return { ok: false, dryRun: true, errorCode: "RATE_LIMITED", errorMessage: `retryAfterMs=${rate.retryAfterMs}` };
    }
    const listingId = `DRY-${this.marketplaceId.toUpperCase()}-${payload.productId}-${Date.now()}`;
    return this.dryRunOk({ marketplaceListingId: listingId });
  }

  async updateListing(
    marketplaceListingId: string,
    _payload: Partial<ListingPayload>
  ): Promise<ConnectorResult<{ marketplaceListingId: string }>> {
    if (!hasCapability(this.marketplaceId, "productUpdate")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ marketplaceListingId });
  }

  async pauseListing(marketplaceListingId: string): Promise<ConnectorResult<{ status: string }>> {
    return this.dryRunOk({ status: `PAUSED:${marketplaceListingId}` });
  }

  async deleteListing(marketplaceListingId: string): Promise<ConnectorResult<{ status: string }>> {
    return this.dryRunOk({ status: `DELETED:${marketplaceListingId}` });
  }

  async updatePrice(
    marketplaceListingId: string,
    price: number,
    currency: string
  ): Promise<ConnectorResult<{ price: number; currency: string }>> {
    if (!hasCapability(this.marketplaceId, "priceUpdate")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ price, currency });
  }

  async updateStock(
    _marketplaceListingId: string,
    stock: number
  ): Promise<ConnectorResult<{ stock: number }>> {
    if (!hasCapability(this.marketplaceId, "stockUpdate")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ stock });
  }

  async fetchOrders(_since?: string): Promise<ConnectorResult<{ orders: unknown[] }>> {
    if (!hasCapability(this.marketplaceId, "orderImport")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ orders: [] });
  }

  async fetchOrder(marketplaceOrderId: string): Promise<ConnectorResult<{ order: unknown }>> {
    return this.dryRunOk({ order: { marketplaceOrderId, dryRun: true } });
  }

  async acknowledgeOrder(marketplaceOrderId: string): Promise<ConnectorResult<{ acknowledged: boolean }>> {
    if (!hasCapability(this.marketplaceId, "orderAcknowledgement")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ acknowledged: true });
  }

  async createShipment(input: {
    marketplaceOrderId: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
  }): Promise<ConnectorResult<{ shipmentId: string }>> {
    if (!hasCapability(this.marketplaceId, "shipmentCreation")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ shipmentId: `DRY-SHIP-${input.marketplaceOrderId}` });
  }

  async updateTracking(
    shipmentId: string,
    trackingNumber: string,
    _trackingUrl?: string
  ): Promise<ConnectorResult<{ updated: boolean }>> {
    if (!hasCapability(this.marketplaceId, "trackingUpdate")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ updated: true });
  }

  async fetchReturns(_since?: string): Promise<ConnectorResult<{ returns: unknown[] }>> {
    if (!hasCapability(this.marketplaceId, "returns")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ returns: [] });
  }

  async fetchRefunds(_since?: string): Promise<ConnectorResult<{ refunds: unknown[] }>> {
    if (!hasCapability(this.marketplaceId, "refunds")) {
      return { ok: false, dryRun: true, errorCode: "CAPABILITY_NOT_SUPPORTED" };
    }
    return this.dryRunOk({ refunds: [] });
  }
}

const connectorCache = new Map<string, MarketplaceConnector>();

export function getMarketplaceConnector(marketplaceId: string): MarketplaceConnector {
  let connector = connectorCache.get(marketplaceId);
  if (!connector) {
    connector = new DryRunMarketplaceConnector(marketplaceId);
    connectorCache.set(marketplaceId, connector);
  }
  return connector;
}

export async function connectMarketplace(marketplaceId: string): Promise<ConnectorResult<{ status: string }>> {
  return withRetry(() => getMarketplaceConnector(marketplaceId).connect(), { maxAttempts: 2 });
}

export async function healthCheckMarketplace(
  context: MarketplaceConnectorContext
): Promise<ConnectorResult<{ latencyMs: number; healthy: boolean }>> {
  return getMarketplaceConnector(context.marketplaceId).healthCheck();
}

export function clearConnectorCache(): void {
  connectorCache.clear();
}
