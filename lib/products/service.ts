import type { BuzzardCategory } from "@/lib/categories/types";
import { collectDescendantIds, isCategoryInScope, getCategoryById } from "@/lib/categories/service";
import { getCategoryLabel } from "@/lib/categories/i18n";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { sanitizeSearchQuery } from "@/lib/security";
import { productCatalog } from "./source";
import type {
  BuzzardProduct,
  ProductListResult,
  PublicProduct,
  StockStatus,
} from "./types";

const { products: rawProducts } = productCatalog;

const byId = new Map<string, BuzzardProduct>();
const bySlug = new Map<string, BuzzardProduct>();
const activePublicProducts: PublicProduct[] = [];

function deriveStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}

export function toPublicProduct(product: BuzzardProduct): PublicProduct {
  return {
    id: product.id,
    sku: product.sku,
    eanGtin: product.ean_gtin,
    brand: product.brand,
    name: product.name,
    shortDescription: product.short_description,
    description: product.description,
    categoryId: product.category_id,
    categoryIds: product.category_ids,
    images: product.images,
    imageKey: product.attributes.image_key,
    documents: product.documents,
    attributes: Object.fromEntries(
      Object.entries(product.attributes).filter(([key]) => key !== "image_key")
    ),
    variants: product.variants,
    price: product.price.amount,
    compareAtPrice: product.compare_at_price?.amount,
    vatRate: product.vat_rate,
    stock: product.stock,
    stockStatus: product.stock_status ?? deriveStockStatus(product.stock),
    shipping: product.shipping,
    seo: product.seo,
    buyNowEnabled: product.buy_now_enabled ?? false,
    url: productHref(product),
  };
}

export function productHref(product: Pick<BuzzardProduct, "seo">): string {
  const slug = product.seo.slug.replace(/^\/+|\/+$/g, "");
  return `/produkt/${slug}/`;
}

function indexProducts() {
  for (const product of rawProducts) {
    byId.set(product.id, product);
    bySlug.set(product.seo.slug, product);
    if (product.status === "active") {
      activePublicProducts.push(toPublicProduct(product));
    }
  }
}

indexProducts();

export function getAllProducts(): PublicProduct[] {
  return activePublicProducts;
}

export function getProductById(id: string): PublicProduct | undefined {
  const product = byId.get(id);
  return product?.status === "active" ? toPublicProduct(product) : undefined;
}

export function getProductBySlug(slug: string): PublicProduct | undefined {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const product = bySlug.get(normalized);
  return product?.status === "active" ? toPublicProduct(product) : undefined;
}

export function getProductBySku(sku: string): { product: PublicProduct; variantIds: string[] } | undefined {
  const normalized = sku.trim();
  if (!normalized) return undefined;

  for (const product of rawProducts) {
    if (product.status !== "active") continue;
    if (product.sku === normalized) {
      return { product: toPublicProduct(product), variantIds: [] };
    }
    for (const variant of product.variants || []) {
      if (variant.sku === normalized) {
        return { product: toPublicProduct(product), variantIds: [variant.id] };
      }
    }
  }

  return undefined;
}

export function getRawProductById(id: string): BuzzardProduct | undefined {
  return byId.get(id);
}

export function getProductStaticParams(): { slug: string }[] {
  return activePublicProducts.map((p) => ({ slug: p.seo.slug }));
}

export function getLegacyProductParams(): { id: string }[] {
  return activePublicProducts.map((p) => ({ id: p.id }));
}

export function getCategoryLabelForProduct(product: PublicProduct, locale: BuzzardLocale = "de"): string {
  const category = getCategoryById(product.categoryId);
  return category ? getCategoryLabel(category, locale) : product.categoryId;
}

export function getProductsForCategory(category: BuzzardCategory, limit?: number): PublicProduct[] {
  const ids = new Set(collectDescendantIds(category.id));
  const matched = activePublicProducts.filter((p) => ids.has(p.categoryId));
  return limit ? matched.slice(0, limit) : matched;
}

export function getRelatedProducts(product: PublicProduct, limit = 4): PublicProduct[] {
  return activePublicProducts
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, limit);
}

export function getFrequentlyBoughtTogether(product: PublicProduct, limit = 3): PublicProduct[] {
  return activePublicProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        product.categoryIds.some((id) => p.categoryIds.includes(id))
    )
    .slice(0, limit);
}

const legacyFilterToCategoryId: Record<string, string> = {
  bremsen: "cat-05-03",
  motorenöle: "cat-05-01",
  filter: "cat-05-02",
  zündung: "cat-05-11",
  batterien: "cat-05-04",
  fahrwerk: "cat-05-11",
};

export function filterProducts(
  items: PublicProduct[],
  filter: string,
  query?: string | null,
  buzzardCategory?: BuzzardCategory | null
): PublicProduct[] {
  let result = items;

  if (buzzardCategory) {
    result = result.filter((p) => isCategoryInScope(p.categoryId, buzzardCategory.id));
  } else if (filter && filter !== "alle") {
    if (filter.startsWith("cat-")) {
      result = result.filter((p) => isCategoryInScope(p.categoryId, filter));
    } else {
      const categoryId = legacyFilterToCategoryId[filter];
      if (categoryId) {
        result = result.filter((p) => isCategoryInScope(p.categoryId, categoryId));
      }
    }
  }

  if (query) {
    const q = sanitizeSearchQuery(query).toLowerCase();
    if (!q) return result;
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.eanGtin.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        getCategoryLabelForProduct(p).toLowerCase().includes(q) ||
        Object.values(p.attributes).some((value) => value.toLowerCase().includes(q))
    );
  }

  return result;
}

export function sortProducts(items: PublicProduct[], sort: string): PublicProduct[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "name-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name, "de"));
    case "bestseller":
      return list.sort((a, b) => a.price - b.price);
    default:
      return list;
  }
}

export function paginateProducts(
  items: PublicProduct[],
  page = 1,
  pageSize = 12
): ProductListResult {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function searchProducts(
  query: string,
  options?: {
    filter?: string;
    category?: BuzzardCategory | null;
    page?: number;
    pageSize?: number;
  }
): ProductListResult {
  const filtered = filterProducts(
    activePublicProducts,
    options?.filter ?? "alle",
    query,
    options?.category ?? null
  );
  return paginateProducts(filtered, options?.page ?? 1, options?.pageSize ?? 12);
}

export const PRODUCT_COUNT = activePublicProducts.length;
