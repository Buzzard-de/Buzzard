import { listMarkets } from "@/lib/market-engine/registry";
import type {
  CategoryMapping,
  MarketplaceDefinition,
  MarketplaceListing,
  MarketplaceOrderMapping,
  MarketplaceProductMapping,
  MarketplaceReturnRecord,
  MarketplaceShipment,
  MarketplaceStockPolicy,
  SyncJob,
  WebhookEvent,
} from "./types";

const marketplaces = new Map<string, MarketplaceDefinition>();
const productMappings = new Map<string, MarketplaceProductMapping>();
const categoryMappings = new Map<string, CategoryMapping>();
const listings = new Map<string, MarketplaceListing>();
const orderMappings = new Map<string, MarketplaceOrderMapping>();
const shipments = new Map<string, MarketplaceShipment>();
const returns = new Map<string, MarketplaceReturnRecord>();
const webhooks = new Map<string, WebhookEvent>();
const syncJobs = new Map<string, SyncJob>();
const stockPolicies = new Map<string, MarketplaceStockPolicy>();
const idempotencyIndex = new Map<string, string>();

let orderCounter = 0;
let listingCounter = 0;
let mappingCounter = 0;

function baseCapabilities(partial: Partial<MarketplaceDefinition["capabilities"]> = {}): MarketplaceDefinition["capabilities"] {
  return {
    productListing: false,
    productUpdate: false,
    priceUpdate: false,
    stockUpdate: false,
    orderImport: false,
    orderAcknowledgement: false,
    shipmentCreation: false,
    trackingUpdate: false,
    returns: false,
    refunds: false,
    webhooks: false,
    api: false,
    xml: false,
    csv: false,
    ...partial,
  };
}

const EU_MARKETS = ["DE", "FR", "PL", "CZ", "AT", "NL", "BE", "IT", "ES"];
const GCC_MARKETS = ["SA", "AE", "EG"];

function buildMarketplace(
  marketplaceId: string,
  displayName: string,
  supportedMarkets: string[],
  supportedCurrencies: string[],
  channel: MarketplaceDefinition["supportedChannels"][number],
  capabilities: Partial<MarketplaceDefinition["capabilities"]>,
  status: MarketplaceDefinition["status"] = "DISCOVERED"
): MarketplaceDefinition {
  const now = new Date().toISOString();
  return {
    marketplaceId,
    name: marketplaceId,
    displayName,
    country: supportedMarkets[0] ?? "DE",
    supportedMarkets,
    supportedCountries: supportedMarkets,
    supportedCurrencies,
    supportedChannels: [channel],
    status,
    capabilities: baseCapabilities(capabilities),
    connectorType: "dry-run",
    createdAt: now,
    updatedAt: now,
  };
}

function seedMarketplaces(): void {
  if (marketplaces.size > 0) return;

  const defs: MarketplaceDefinition[] = [
    buildMarketplace("amazon", "Amazon", [...EU_MARKETS, ...GCC_MARKETS], ["EUR", "PLN", "CZK", "SAR", "AED", "EGP"], "amazon", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      returns: true,
      refunds: true,
      webhooks: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("ebay", "eBay", [...EU_MARKETS, "TR"], ["EUR", "PLN", "CZK", "TRY"], "ebay", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      returns: true,
      refunds: true,
      webhooks: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("kaufland", "Kaufland", ["DE", "CZ", "SK", "PL", "AT"], ["EUR", "CZK", "PLN"], "kaufland", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      api: true,
    }, "TESTING"),
    buildMarketplace("allegro", "Allegro", ["PL", "CZ", "SK", "HU"], ["PLN", "CZK"], "allegro", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("bol", "bol.com", ["NL", "BE"], ["EUR"], "bol", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("cdiscount", "Cdiscount", ["FR"], ["EUR"], "cdiscount", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      api: true,
      xml: true,
    }, "DISCOVERED"),
    buildMarketplace("otto", "OTTO", ["DE"], ["EUR"], "otto", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      api: true,
      csv: true,
    }, "DISCOVERED"),
    buildMarketplace("emag", "eMAG", ["RO", "BG", "HU"], ["RON", "BGN", "HUF"], "emag", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("skroutz", "Skroutz", ["GR", "CY"], ["EUR"], "skroutz", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      api: true,
    }, "DISCOVERED"),
    buildMarketplace("TEST_AMAZON", "Test Amazon", ["DE"], ["EUR"], "amazon", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      returns: true,
      refunds: true,
      webhooks: true,
      api: true,
    }, "TESTING"),
    buildMarketplace("TEST_EBAY", "Test eBay", ["DE", "FR"], ["EUR"], "ebay", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      shipmentCreation: true,
      trackingUpdate: true,
      webhooks: true,
      api: true,
    }, "TESTING"),
    buildMarketplace("TEST_KAUFLAND", "Test Kaufland", ["DE", "PL"], ["EUR", "PLN"], "kaufland", {
      productListing: true,
      productUpdate: true,
      priceUpdate: true,
      stockUpdate: true,
      orderImport: true,
      orderAcknowledgement: true,
      api: true,
    }, "TESTING"),
  ];

  for (const def of defs) {
    marketplaces.set(def.marketplaceId, def);
  }
}

export function generateListingId(): string {
  listingCounter += 1;
  return `lst_${Date.now()}_${listingCounter}`;
}

export function generateMappingId(): string {
  mappingCounter += 1;
  return `mpm_${Date.now()}_${mappingCounter}`;
}

export function generateOrderMappingId(): string {
  orderCounter += 1;
  return `mom_${Date.now()}_${orderCounter}`;
}

export function getMarketplace(marketplaceId: string): MarketplaceDefinition | undefined {
  seedMarketplaces();
  return marketplaces.get(marketplaceId);
}

export function listMarketplaces(): MarketplaceDefinition[] {
  seedMarketplaces();
  return [...marketplaces.values()];
}

export function listMarketplacesForMarket(marketId: string): MarketplaceDefinition[] {
  seedMarketplaces();
  return listMarketplaces().filter((m) => m.supportedMarkets.includes(marketId));
}

export function updateMarketplaceStatus(
  marketplaceId: string,
  status: MarketplaceDefinition["status"]
): MarketplaceDefinition | undefined {
  const mp = getMarketplace(marketplaceId);
  if (!mp) return undefined;
  const updated = { ...mp, status, updatedAt: new Date().toISOString() };
  marketplaces.set(marketplaceId, updated);
  return updated;
}

export function hasCapability(
  marketplaceId: string,
  capability: keyof MarketplaceDefinition["capabilities"]
): boolean {
  const mp = getMarketplace(marketplaceId);
  return Boolean(mp?.capabilities[capability]);
}

export function saveProductMapping(mapping: MarketplaceProductMapping): void {
  productMappings.set(mapping.mappingId, mapping);
}

export function getProductMapping(mappingId: string): MarketplaceProductMapping | undefined {
  return productMappings.get(mappingId);
}

export function getProductMappingsForProduct(productId: string): MarketplaceProductMapping[] {
  return [...productMappings.values()].filter((m) => m.productId === productId);
}

export function getProductMappingByListing(
  marketplaceId: string,
  marketplaceListingId: string
): MarketplaceProductMapping | undefined {
  return [...productMappings.values()].find(
    (m) => m.marketplaceId === marketplaceId && m.marketplaceListingId === marketplaceListingId
  );
}

export function saveCategoryMapping(mapping: CategoryMapping): void {
  categoryMappings.set(mapping.mappingId, mapping);
}

export function getCategoryMapping(
  marketplaceId: string,
  marketId: string,
  buzzardCategoryId: string
): CategoryMapping | undefined {
  return [...categoryMappings.values()].find(
    (m) =>
      m.marketplaceId === marketplaceId &&
      m.marketId === marketId &&
      m.buzzardCategoryId === buzzardCategoryId &&
      m.status === "ACTIVE"
  );
}

export function saveListing(listing: MarketplaceListing): void {
  listings.set(listing.listingId, listing);
}

export function getListing(listingId: string): MarketplaceListing | undefined {
  return listings.get(listingId);
}

export function listListings(marketplaceId?: string): MarketplaceListing[] {
  const all = [...listings.values()];
  return marketplaceId ? all.filter((l) => l.marketplaceId === marketplaceId) : all;
}

export function getListingByMarketplaceSku(
  marketplaceId: string,
  marketplaceSku: string
): MarketplaceListing | undefined {
  return [...listings.values()].find(
    (l) => l.marketplaceId === marketplaceId && l.marketplaceSku === marketplaceSku
  );
}

export function saveOrderMapping(mapping: MarketplaceOrderMapping): void {
  orderMappings.set(mapping.mappingId, mapping);
  idempotencyIndex.set(`${mapping.marketplaceId}:${mapping.marketplaceOrderId}`, mapping.mappingId);
}

export function getOrderMappingByMarketplaceOrder(
  marketplaceId: string,
  marketplaceOrderId: string
): MarketplaceOrderMapping | undefined {
  const key = `${marketplaceId}:${marketplaceOrderId}`;
  const mappingId = idempotencyIndex.get(key);
  return mappingId ? orderMappings.get(mappingId) : undefined;
}

export function listOrderMappings(marketplaceId?: string): MarketplaceOrderMapping[] {
  const all = [...orderMappings.values()];
  return marketplaceId ? all.filter((m) => m.marketplaceId === marketplaceId) : all;
}

export function saveShipment(shipment: MarketplaceShipment): void {
  shipments.set(shipment.shipmentId, shipment);
}

export function getShipment(shipmentId: string): MarketplaceShipment | undefined {
  return shipments.get(shipmentId);
}

export function listShipments(orderId?: string): MarketplaceShipment[] {
  const all = [...shipments.values()];
  return orderId ? all.filter((s) => s.orderId === orderId) : all;
}

export function saveReturnRecord(record: MarketplaceReturnRecord): void {
  returns.set(record.marketplaceReturnId, record);
}

export function getReturnRecord(marketplaceReturnId: string): MarketplaceReturnRecord | undefined {
  return returns.get(marketplaceReturnId);
}

export function listReturnRecords(marketplaceId?: string): MarketplaceReturnRecord[] {
  const all = [...returns.values()];
  return marketplaceId ? all.filter((r) => r.marketplaceId === marketplaceId) : all;
}

export function saveWebhookEvent(event: WebhookEvent): void {
  webhooks.set(event.eventId, event);
}

export function getWebhookByHash(marketplaceId: string, payloadHash: string): WebhookEvent | undefined {
  return [...webhooks.values()].find(
    (w) => w.marketplaceId === marketplaceId && w.payloadHash === payloadHash
  );
}

export function saveSyncJob(job: SyncJob): void {
  syncJobs.set(job.jobId, job);
}

export function getSyncJob(jobId: string): SyncJob | undefined {
  return syncJobs.get(jobId);
}

export function listSyncJobs(marketplaceId?: string): SyncJob[] {
  const all = [...syncJobs.values()];
  return marketplaceId ? all.filter((j) => j.marketplaceId === marketplaceId) : all;
}

export function setStockPolicy(marketplaceId: string, policy: MarketplaceStockPolicy): void {
  stockPolicies.set(marketplaceId, policy);
}

export function getStockPolicy(marketplaceId: string): MarketplaceStockPolicy {
  return stockPolicies.get(marketplaceId) ?? {};
}

export function validateMarketExists(marketId: string): boolean {
  return listMarkets().some((m) => m.countryCode === marketId);
}

export function clearMarketplaceRegistry(): void {
  marketplaces.clear();
  productMappings.clear();
  categoryMappings.clear();
  listings.clear();
  orderMappings.clear();
  shipments.clear();
  returns.clear();
  webhooks.clear();
  syncJobs.clear();
  stockPolicies.clear();
  idempotencyIndex.clear();
  orderCounter = 0;
  listingCounter = 0;
  mappingCounter = 0;
}
