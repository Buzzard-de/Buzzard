export type {
  AutomotiveCompatibility,
  DuplicateMatchResult,
  MarketAvailabilityEntry,
  NormalizeSupplierInput,
  ProductEngineAdminRow,
  ProductEngineProduct,
  ProductEngineStatus,
  ProductEvent,
  ProductEventType,
  ProductImage,
  ProductImageType,
  ProductPricing,
  ProductSeoByLocale,
  ProductSnapshot,
  ProductStock,
  ProductTechnicalData,
  ProductTranslation,
  ProductType,
  ProductValidationResult,
  SupplierOffer,
  SupplierSelectionCriteria,
  SupplierSelectionResult,
  SupplierSourceType,
} from "./types";

export { canTransitionStatus, mapStorefrontStatus, resolveStatusFromStock } from "./status";
export { fromBuzzardProduct, toBuzzardProduct } from "./adapters/buzzardProduct";
export {
  engineProductToCanonical,
  engineProductToFlat,
  normalizeCanonicalProduct,
  toFlatCanonicalProduct,
} from "./adapters/canonical";
export { FIXTURE_PRODUCT_IDS, loadFixtureProduct, loadFixtureProducts } from "./fixtures";
export {
  getRegistryCount,
  getRegistryProduct,
  getRegistryProductByEan,
  getRegistryProductBySku,
  listRegistryProducts,
  upsertRegistryProduct,
} from "./registry";
export {
  createProductTranslation,
  getTranslationForLocale,
  hasRequiredTranslation,
  splitRawProductFields,
} from "./translations";
export {
  extractTechnicalFromAttributes,
  mergeTechnicalData,
  normalizeTechnicalData,
  validateTechnicalConsistency,
} from "./technicalData";
export {
  normalizeCompatibilityEntry,
  normalizeCompatibilityList,
  toTecdocReadyFormat,
} from "./compatibility";
export { normalizeProductImage, normalizeProductImages, sanitizeImageUrl, validateProductImages } from "./images";
export { createSeoEntry, getSlugForLocale, validateSeoEntries } from "./seo";
export { createSupplierOffer, updateSupplierOffer, selectBestSupplier, addSupplierOffer } from "./supplier";
export { buildProductPricing, calculateProductDisplayPrice, recalculatePricingFromBestOffer } from "./pricing";
export { setMarketAvailability, isProductAvailableInMarket, getActiveMarkets } from "./availability";
export { validateProduct } from "./validation";
export { compareProducts, findDuplicateProduct } from "./duplicate";
export { updateProductStock, aggregateSupplierStock } from "./stock";
export { emitProductEvent, getProductEvents, clearProductEvents } from "./events";
export { createProductSnapshot } from "./snapshot";
export { normalizeSupplierProduct, normalizedRecordToEngineProduct } from "./normalization";
export { ingestSupplierProduct } from "./ingestion";
export { sanitizeClientProductUpdate, validateServerSupplierOffer } from "./security";
export { getProductEngineAdminOverview } from "./admin";
export {
  getProduct,
  getProductBySku,
  getProductByEan,
  searchProducts,
  getProductsByCategory,
  getProductsForMarket,
  createProduct,
  updateProduct,
  setProductStatus,
  updateProductSupplierOffer,
  normalizeAndIngestSupplierProduct,
} from "./service";
