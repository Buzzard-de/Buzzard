export type {
  AttributeMappingEntry,
  CategoryMapping,
  ConnectorResult,
  ImportMarketplaceOrderInput,
  ImportMarketplaceOrderResult,
  ListingPayload,
  ListingStatus,
  MarketplaceAuditEntry,
  MarketplaceCapabilities,
  MarketplaceDefinition,
  MarketplaceEngineAdminRow,
  MarketplaceErrorCode,
  MarketplaceEvent,
  MarketplaceEventType,
  MarketplaceHealth,
  MarketplaceListing,
  MarketplaceOrderMapping,
  MarketplaceProductMapping,
  MarketplaceReturnRecord,
  MarketplaceShipment,
  MarketplaceStatus,
  MarketplaceStockPolicy,
  PublishEligibilityInput,
  PublishEligibilityResult,
  SyncJob,
  SyncJobType,
  WebhookEvent,
} from "./types";

export {
  getMarketplace,
  listMarketplaces,
  listMarketplacesForMarket,
  updateMarketplaceStatus,
  hasCapability,
  getListing,
  listListings,
  getProductMapping,
  getProductMappingsForProduct,
  getOrderMappingByMarketplaceOrder,
  getStockPolicy,
  setStockPolicy,
  clearMarketplaceRegistry,
} from "./registry";

export type { MarketplaceConnector } from "./connector";
export {
  DryRunMarketplaceConnector,
  getMarketplaceConnector,
  connectMarketplace,
  healthCheckMarketplace,
  clearConnectorCache,
} from "./connector";

export {
  createCategoryMapping,
  resolveMarketplaceCategory,
  mapAttributes,
  buildDefaultAttributeMappings,
  createProductMapping,
  resolveListingTitle,
  resolveListingDescription,
} from "./mapping";

export { evaluatePublishEligibility, listPublishableProducts } from "./product";
export { getMarketplacePrice, resolveMarketplaceChannel } from "./price";
export { getMarketplaceStock } from "./inventory";

export {
  validateListingPayload,
  buildListingPayload,
  createListing,
  updateListing,
  pauseListing,
  isTechnicalAttribute,
} from "./listing";

export {
  mapMarketplaceOrderStatus,
  importMarketplaceOrder,
  fetchMarketplaceOrders,
} from "./order";

export { createMarketplaceShipment, updateMarketplaceTracking } from "./shipment";
export {
  documentMarketplaceRefundChain,
  createMarketplaceReturn,
  initMarketplaceRefund,
} from "./returns";

export { runSyncJob, getSyncJob } from "./sync";
export {
  emitMarketplaceEvent,
  getMarketplaceEvents,
  clearMarketplaceEvents,
  receiveWebhook,
  hashWebhookPayload,
} from "./events";
export {
  recordMarketplaceAudit,
  getMarketplaceAuditLog,
  clearMarketplaceAuditLog,
} from "./audit";
export { checkMarketplaceHealth, checkAllMarketplaceHealth } from "./health";
export {
  rejectClientMarketplaceModification,
  sanitizeClientMarketplacePatch,
  redactMarketplaceSecrets,
  isServerOnlyMarketplaceField,
} from "./security";
export {
  buildMarketplaceAdminRow,
  getMarketplaceAdminOverview,
  getMarketplaceAdminDetail,
} from "./admin";

export {
  seedMarketplaceEngineFixtures,
  buildListingInput,
  buildImportOrderInput,
  TEST_AMAZON,
  TEST_EBAY,
  TEST_KAUFLAND,
  MARKETPLACE_TEST_MARKETS,
} from "./test-fixtures";
