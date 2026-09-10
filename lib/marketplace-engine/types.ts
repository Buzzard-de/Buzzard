import type { PricingChannel } from "@/lib/pricing-engine/types";

export type MarketplaceStatus =
  | "DISCOVERED"
  | "TESTING"
  | "CONNECTED"
  | "ACTIVE"
  | "PAUSED"
  | "DISABLED";

export type ConnectorType = "api" | "xml" | "csv" | "webhook" | "manual" | "dry-run";

export type MarketplaceCapabilityFlag =
  | "productListing"
  | "productUpdate"
  | "priceUpdate"
  | "stockUpdate"
  | "orderImport"
  | "orderAcknowledgement"
  | "shipmentCreation"
  | "trackingUpdate"
  | "returns"
  | "refunds"
  | "webhooks"
  | "api"
  | "xml"
  | "csv";

export type ListingStatus =
  | "DRAFT"
  | "READY"
  | "ACTIVE"
  | "PAUSED"
  | "OUT_OF_STOCK"
  | "ERROR"
  | "REVIEW_REQUIRED"
  | "DISABLED";

export type SyncJobType =
  | "FULL_PRODUCT_SYNC"
  | "INCREMENTAL_PRODUCT_SYNC"
  | "PRICE_SYNC"
  | "STOCK_SYNC"
  | "ORDER_SYNC"
  | "SHIPMENT_SYNC"
  | "RETURN_SYNC";

export type SyncJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type WebhookEventStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "DUPLICATE";

export type MarketplaceEventType =
  | "MARKETPLACE_REGISTERED"
  | "LISTING_CREATED"
  | "LISTING_UPDATED"
  | "LISTING_PAUSED"
  | "LISTING_DELETED"
  | "PRICE_SYNCED"
  | "STOCK_SYNCED"
  | "ORDER_IMPORTED"
  | "ORDER_ACKNOWLEDGED"
  | "SHIPMENT_CREATED"
  | "TRACKING_UPDATED"
  | "RETURN_IMPORTED"
  | "WEBHOOK_RECEIVED"
  | "SYNC_STARTED"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "HEALTH_CHECK";

export type MarketplaceErrorCode =
  | "MARKETPLACE_NOT_FOUND"
  | "CAPABILITY_NOT_SUPPORTED"
  | "VALIDATION_FAILED"
  | "MAPPING_NOT_FOUND"
  | "PRICING_FAILED"
  | "OUT_OF_STOCK"
  | "ORDER_IMPORT_FAILED"
  | "DUPLICATE_ORDER"
  | "WEBHOOK_DUPLICATE"
  | "RATE_LIMITED"
  | "CONNECTOR_ERROR"
  | "UNAUTHORIZED";

export interface MarketplaceCapabilities {
  productListing: boolean;
  productUpdate: boolean;
  priceUpdate: boolean;
  stockUpdate: boolean;
  orderImport: boolean;
  orderAcknowledgement: boolean;
  shipmentCreation: boolean;
  trackingUpdate: boolean;
  returns: boolean;
  refunds: boolean;
  webhooks: boolean;
  api: boolean;
  xml: boolean;
  csv: boolean;
}

export interface MarketplaceDefinition {
  marketplaceId: string;
  name: string;
  displayName: string;
  country: string;
  supportedMarkets: string[];
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedChannels: PricingChannel[];
  status: MarketplaceStatus;
  capabilities: MarketplaceCapabilities;
  connectorType: ConnectorType;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceStockPolicy {
  stockBuffer?: number;
  maxPublishedQuantity?: number;
  minPublishedQuantity?: number;
}

export interface MarketplaceProductMapping {
  mappingId: string;
  productId: string;
  marketplaceId: string;
  marketplaceListingId?: string;
  marketplaceSku?: string;
  ean?: string;
  status: ListingStatus;
  marketId: string;
  categoryMapping?: CategoryMappingRef;
  titleMapping?: Record<string, string>;
  descriptionMapping?: Record<string, string>;
  attributeMapping?: AttributeMappingEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMappingRef {
  buzzardCategoryId: string;
  marketplaceCategoryId: string;
}

export interface CategoryMapping {
  mappingId: string;
  marketplaceId: string;
  marketId: string;
  buzzardCategoryId: string;
  marketplaceCategoryId: string;
  status: "ACTIVE" | "DRAFT" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

export interface AttributeMappingEntry {
  buzzardAttribute: string;
  marketplaceAttribute: string;
  transform?: "identity" | "uppercase" | "lowercase";
}

export interface MarketplaceListing {
  listingId: string;
  productId: string;
  marketplaceId: string;
  marketId: string;
  marketplaceListingId: string;
  marketplaceSku: string;
  status: ListingStatus;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  ean?: string;
  categoryId?: string;
  attributes: Record<string, string>;
  language: string;
  lastSyncedAt?: string;
  validationErrors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingPayload {
  marketplaceId: string;
  marketId: string;
  productId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  ean?: string;
  marketplaceSku: string;
  categoryId?: string;
  attributes: Record<string, string>;
  language: string;
  dryRun: true;
}

export interface MarketplaceOrderMapping {
  mappingId: string;
  marketplaceId: string;
  marketplaceOrderId: string;
  orderId: string;
  status: string;
  importedAt: string;
  updatedAt: string;
}

export interface MarketplaceOrderStatusMapping {
  marketplaceStatus: string;
  buzzardStatus: string;
}

export interface MarketplaceShipment {
  shipmentId: string;
  marketplaceId: string;
  orderId: string;
  marketplaceOrderId?: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  status: "PREPARED" | "SUBMITTED" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
  shippedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReturnRecord {
  marketplaceReturnId: string;
  orderId: string;
  marketplaceId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CLOSED";
  reason?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  refundedAmount?: number;
  requestedAt: string;
  resolvedAt?: string;
}

export interface WebhookEvent {
  eventId: string;
  marketplaceId: string;
  eventType: string;
  payloadHash: string;
  receivedAt: string;
  processedAt?: string;
  status: WebhookEventStatus;
}

export interface SyncJob {
  jobId: string;
  marketplaceId: string;
  type: SyncJobType;
  status: SyncJobStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  itemsProcessed: number;
  createdAt: string;
}

export interface MarketplaceHealth {
  marketplaceId: string;
  connector: ConnectorType;
  status: MarketplaceStatus;
  latencyMs: number;
  lastSuccessfulSync?: string;
  lastError?: string;
  productsSynced: number;
  pricesSynced: number;
  stockSynced: number;
  ordersSynced: number;
  webhooksProcessed: number;
  checkedAt: string;
}

export interface MarketplaceEvent {
  eventId: string;
  marketplaceId: string;
  type: MarketplaceEventType;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceAuditEntry {
  auditId: string;
  marketplaceId: string;
  actor: string;
  action: string;
  timestamp: string;
  relatedListingId?: string;
  relatedOrderId?: string;
  statusTransition?: string;
}

export interface MarketplaceEngineAdminRow {
  marketplaceId: string;
  displayName: string;
  status: MarketplaceStatus;
  markets: string[];
  capabilities: string[];
  activeListings: number;
  errorListings: number;
  lastSync?: string;
  healthStatus: string;
  ordersImported: number;
  returnsPending: number;
}

export interface PublishEligibilityInput {
  productId: string;
  marketplaceId: string;
  marketId: string;
}

export interface PublishEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface ImportMarketplaceOrderInput {
  marketplaceId: string;
  marketplaceOrderId: string;
  marketId: string;
  channel: PricingChannel;
  customerId: string;
  customerEmail: string;
  items: Array<{ productId: string; quantity: number; unitGrossPrice: number }>;
  marketplaceStatus: string;
  idempotencyKey: string;
  shippingAddress: {
    recipientName: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    houseNumber?: string;
    company?: string;
    phone?: string;
  };
}

export interface ImportMarketplaceOrderResult {
  ok: boolean;
  orderId?: string;
  mapping?: MarketplaceOrderMapping;
  idempotentReplay?: boolean;
  errorCode?: MarketplaceErrorCode;
  errorMessage?: string;
}

export interface ConnectorResult<T = unknown> {
  ok: boolean;
  dryRun: true;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

export interface MarketplaceConnectorContext {
  marketplaceId: string;
  marketId: string;
}
