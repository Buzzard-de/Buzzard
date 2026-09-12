export { getOrder } from "@/lib/order-engine";

export {
  syncCommerceOrderToEngine,
  mapCommerceAddressToSnapshot,
  resolveOrderEngineOrderId,
  validatePurchaseSignalAccess,
  ingestAuthoritativePurchaseForOrder,
  ingestStorefrontPurchaseSignalResolved,
} from "./orderEngineBridge";

export {
  getCommerceOrderMapping,
  saveCommerceOrderMapping,
  clearCommerceOrderMappings,
  listCommerceOrderMappings,
} from "./orderEngineRegistry";

export { validateOrderIdForAuthoritativePurchase } from "./purchaseValidation";
