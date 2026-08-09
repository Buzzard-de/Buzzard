import type { CatalogProduct } from "./types";
import type { PublicProduct, StockStatus } from "@/lib/products/types";

function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}

export function mapCatalogProductToPublic(product: CatalogProduct): PublicProduct {
  const slug = product.slug.replace(/^\/+|\/+$/g, "");
  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images?.map((img) => img.url).filter(Boolean) ?? []),
  ];

  return {
    id: `catalog-${product.id}`,
    sku: product.sku,
    eanGtin: "",
    brand: "Buzzard",
    name: product.name,
    shortDescription: (product.description || "").slice(0, 160),
    description: product.description || "",
    categoryId: product.category_slug || product.category || "catalog",
    categoryIds: [product.category_slug || product.category || "catalog"],
    images,
    documents: [],
    attributes: {
      source: "catalog-api",
      category: product.category || "",
    },
    variants: [],
    price: product.price_eur,
    vatRate: 19,
    stock: product.stock,
    stockStatus: stockStatus(product.stock),
    shipping: {
      weight_kg: 1,
      length_cm: 20,
      width_cm: 20,
      height_cm: 10,
      class: "standard",
    },
    seo: {
      slug,
      title: product.seo_title || product.name,
      description: product.seo_description || product.description || product.name,
    },
    buyNowEnabled: true,
    url: `/produkt/${slug}/`,
  };
}
