export type {
  BuzzardProduct,
  BuzzardProductCatalog,
  PublicProduct,
  ProductVariant,
  ProductListResult,
  StockStatus,
} from "./types";

export {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getProductsForCategory,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
  filterProducts,
  paginateProducts,
  searchProducts,
  getProductStaticParams,
  getLegacyProductParams,
  getCategoryLabelForProduct,
  productHref,
  toPublicProduct,
  PRODUCT_COUNT,
} from "./service";

export {
  formatPrice,
  formatVatInfo,
  stockStatusLabel,
  FREE_SHIPPING_THRESHOLD,
  getShippingCost,
} from "./format";

/** Active public catalog – customer-safe, no supplier fields. */
import { getAllProducts, getProductById } from "./service";
export const products = getAllProducts();

export function getProductUrl(id: string): string {
  return getProductById(id)?.url ?? `/products/${id}/`;
}
