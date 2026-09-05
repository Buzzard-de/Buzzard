import type { PublicProduct, StockStatus } from "@/lib/products/types";
import type { StorefrontProduct } from "./types";

function toStockStatus(status: string, stock: number): StockStatus {
  if (status === "out_of_stock" || stock <= 0) return "out_of_stock";
  if (status === "low_stock" || stock < 10) return "low_stock";
  return "in_stock";
}

export function mapStorefrontToPublic(product: StorefrontProduct): PublicProduct {
  const slug = product.seo.slug.replace(/^\/+|\/+$/g, "");
  return {
    id: product.id,
    sku: product.sku,
    eanGtin: product.gtin || product.ean || "",
    brand: product.brand?.name || "",
    name: product.title,
    shortDescription: product.shortDescription || product.description.slice(0, 160),
    description: product.description,
    categoryId: product.categoryId || product.categorySlug || "catalog",
    categoryIds: [product.categoryId || product.categorySlug || "catalog"],
    images: product.images,
    documents: [],
    attributes: {
      ...product.attributes,
      source: product.source || "pim-storefront",
      mpn: product.mpn || "",
    },
    variants: product.variants.map((v) => ({
      id: v.id,
      type: (["size", "color", "pack", "model"].includes(v.axis) ? v.axis : "custom") as import("@/lib/products/types").VariantType,
      label: v.value,
      value: v.value,
      sku: v.sku || "",
      price: null,
      stock: v.stock || 0,
    })),
    price: product.price,
    vatRate: 19,
    stock: product.stock,
    stockStatus: toStockStatus(product.stockStatus, product.stock),
    shipping: { weight_kg: 1, length_cm: 20, width_cm: 20, height_cm: 10, class: "standard" },
    seo: {
      slug,
      title: product.seo.metaTitle || product.title,
      description: product.seo.metaDescription || product.shortDescription || product.title,
    },
    buyNowEnabled: product.buyNowEnabled,
    url: `/produkt/${slug}/`,
  };
}
