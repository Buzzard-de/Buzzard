/**
 * Part 7 — Map PIM Core product → public storefront DTO (no admin/supplier fields)
 */
const categoryEngine = require("../pim/categoryEngine");
const { isStorefrontBridgeEnabled } = require("../../core/storefrontConstants");

const PLACEHOLDER_IMAGE = "/images/product-placeholder.svg";
const ALLOWED_MEDIA_PREFIXES = ["/", "https://buzzard24.de", "https://www.buzzard24.de"];

function isSafeMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username;
  } catch {
    return false;
  }
}

function mapMedia(images = [], documents = []) {
  const mapped = [];
  for (const img of images) {
    const url = img.url || img.src;
    if (!isSafeMediaUrl(url)) continue;
    mapped.push({
      url,
      alt: img.alt_text || img.alt || "",
      primary: Boolean(img.is_primary),
      type: "image",
    });
  }
  for (const doc of documents) {
    const url = doc.url;
    if (!isSafeMediaUrl(url)) continue;
    mapped.push({
      url,
      alt: doc.alt_text || doc.media_type || "document",
      primary: false,
      type: doc.media_type || "document",
    });
  }
  if (!mapped.some((m) => m.primary && m.type === "image") && mapped.length) {
    const firstImage = mapped.find((m) => m.type === "image");
    if (firstImage) firstImage.primary = true;
  }
  return mapped;
}

function stockStatus(stock) {
  if (stock <= 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}

function resolveCategorySlug(categoryId) {
  if (!categoryId) return null;
  const cat = categoryEngine.findTaxonomyCategory(categoryId);
  return cat?.slug || categoryId;
}

function buildStructuredData(product, seo) {
  const salesEnabled = process.env.BUZZARD_SALES_ENABLED === "1";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.sku,
    description: product.shortDescription || product.description || product.title,
    image: (product.media || []).filter((m) => m.type === "image").map((m) => m.url),
    brand: product.brand?.name ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "EUR",
      availability: salesEnabled && product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      url: seo.canonical || undefined,
    },
  };
}

function mapPimToStorefront(product) {
  if (!product) return null;

  const seoRaw = product.seo || {};
  const slug = seoRaw.slug || String(product.title || product.sku)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  const media = mapMedia(product.images, product.documents);
  const imageUrls = media.filter((m) => m.type === "image").map((m) => m.url);
  const categorySlug = resolveCategorySlug(product.category);

  const seo = {
    slug,
    metaTitle: seoRaw.metaTitle || product.title,
    metaDescription: seoRaw.metaDescription || product.shortDescription || "",
    canonical: seoRaw.canonical || `/produkt/${slug}/`,
  };

  const salesEnabled = process.env.BUZZARD_SALES_ENABLED === "1";

  return {
    id: product.id,
    sku: product.sku,
    ean: product.ean || null,
    gtin: product.gtin || null,
    mpn: product.mpn || null,
    title: product.title,
    description: product.description || "",
    shortDescription: product.shortDescription || "",
    brand: product.brand
      ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug }
      : null,
    categoryId: product.category,
    categorySlug,
    subcategoryId: product.subcategory || null,
    attributes: product.attributes || {},
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      axis: v.axis,
      value: v.value,
      priceDelta: v.priceDelta,
      stock: v.stock,
    })),
    media,
    images: imageUrls.length ? imageUrls : [PLACEHOLDER_IMAGE],
    price: Number(product.price) || 0,
    currency: product.currency || "EUR",
    stock: Number(product.stock) || 0,
    stockStatus: stockStatus(Number(product.stock) || 0),
    seo,
    structuredData: buildStructuredData({ ...product, media }, seo),
    catalogMode: !salesEnabled,
    buyNowEnabled: false,
    addToCartEnabled: false,
    source: "pim-core",
    updatedAt: product.updatedAt,
  };
}

module.exports = {
  mapPimToStorefront,
  isSafeMediaUrl,
  PLACEHOLDER_IMAGE,
};
