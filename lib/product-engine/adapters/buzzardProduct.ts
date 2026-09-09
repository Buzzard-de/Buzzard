import type { BuzzardProduct } from "@/lib/products/types";
import type {
  AutomotiveCompatibility,
  ProductEngineProduct,
  ProductImage,
  ProductPricing,
  ProductSeoByLocale,
  ProductStock,
  ProductTranslation,
  SupplierOffer,
} from "../types";
import { mapStorefrontStatus } from "../status";

function parseTechnicalData(product: BuzzardProduct): Record<string, string | number> {
  const attrs = product.attributes || {};
  const technical: Record<string, string | number> = { ...attrs };
  if (product.shipping?.weight_kg) technical.weight_kg = product.shipping.weight_kg;
  if (attrs.viscosity) technical.viscosity = String(attrs.viscosity);
  if (attrs.diameter) technical.diameter = Number(attrs.diameter);
  return technical;
}

function mapCompatibility(entries?: BuzzardProduct["vehicle_compatibility"]): AutomotiveCompatibility[] {
  if (!entries?.length) return [];
  return entries.map((v) => ({
    make: v.brand,
    model: v.model,
    engine: v.engine,
    yearFrom: v.year_from,
    yearTo: v.year_to,
    oemNumbers: v.part_reference ? [v.part_reference] : [],
  }));
}

function mapImages(product: BuzzardProduct): ProductImage[] {
  return (product.images || []).map((url, i) => ({
    url,
    alt: product.name,
    sortOrder: i,
    type: i === 0 ? "MAIN" : "GALLERY",
  }));
}

function mapTranslations(product: BuzzardProduct): ProductTranslation[] {
  const base: ProductTranslation = {
    locale: "de-DE",
    name: product.name,
    shortDescription: product.short_description,
    description: product.description,
    seoTitle: product.seo?.title,
    seoDescription: product.seo?.description,
    slug: product.seo?.slug,
  };
  const entries = [base];
  if (product.i18n) {
    for (const [lang, t] of Object.entries(product.i18n)) {
      entries.push({
        locale: lang,
        name: t.name || product.name,
        shortDescription: t.short_description,
        description: t.description,
        seoTitle: t.seo_title,
        seoDescription: t.seo_description,
      });
    }
  }
  return entries;
}

function mapSeo(product: BuzzardProduct): ProductSeoByLocale[] {
  const entries: ProductSeoByLocale[] = [
    {
      locale: "de-DE",
      seoTitle: product.seo?.title,
      seoDescription: product.seo?.description,
      slug: product.seo?.slug || product.id,
    },
  ];
  if (product.i18n) {
    for (const [lang, t] of Object.entries(product.i18n)) {
      if (t.seo_title || t.seo_description) {
        entries.push({
          locale: lang,
          seoTitle: t.seo_title,
          seoDescription: t.seo_description,
          slug: product.seo?.slug || product.id,
        });
      }
    }
  }
  return entries;
}

function mapSupplierOffer(product: BuzzardProduct): SupplierOffer {
  return {
    supplierId: product.supplier_id,
    supplierSku: product.supplier_sku,
    supplierEan: product.ean_gtin,
    supplierPrice: product.supplier_price?.amount ?? 0,
    currency: product.supplier_price?.currency ?? product.price?.currency ?? "EUR",
    stock: product.stock,
    lastUpdated: product.updated_at,
    source: product.supplier_id,
    sourceType: "MANUAL",
    reliabilityScore: 0.8,
  };
}

function mapPricing(product: BuzzardProduct): ProductPricing {
  const supplierCost = product.supplier_price?.amount ?? 0;
  const customerPrice = product.price?.amount ?? 0;
  const margin = customerPrice > 0 ? (customerPrice - supplierCost) / customerPrice : 0;
  return {
    supplierCost,
    shippingCost: 0,
    marketplaceFee: 0,
    paymentFee: 0,
    vat: product.vat_rate / 100,
    margin,
    customerPrice,
    currency: product.price?.currency ?? "EUR",
  };
}

function mapStock(product: BuzzardProduct): ProductStock {
  const availability =
    product.stock_status === "out_of_stock"
      ? "OUT_OF_STOCK"
      : product.stock_status === "low_stock"
        ? "LOW_STOCK"
        : product.stock_status === "preorder"
          ? "PREORDER"
          : "IN_STOCK";
  return {
    quantity: product.stock,
    availability,
    lastUpdated: product.updated_at,
  };
}

export function fromBuzzardProduct(product: BuzzardProduct): ProductEngineProduct {
  const subcategoryId = product.category_ids?.length > 1 ? product.category_ids[1] : undefined;
  return {
    productId: product.id,
    sku: product.sku,
    ean: product.ean_gtin,
    gtin: product.ean_gtin,
    brand: product.brand,
    manufacturer: product.manufacturer,
    categoryId: product.category_id,
    subcategoryId,
    productType: product.category_id.startsWith("cat-05") ? "automotive" : "general",
    status: mapStorefrontStatus(product.status, product.stock_status),
    weight: product.shipping?.weight_kg,
    weightUnit: "kg",
    dimensions: product.shipping
      ? {
          length: product.shipping.length_cm,
          width: product.shipping.width_cm,
          height: product.shipping.height_cm,
          unit: "cm",
        }
      : undefined,
    images: mapImages(product),
    technicalData: parseTechnicalData(product),
    compatibility: mapCompatibility(product.vehicle_compatibility),
    translations: mapTranslations(product),
    supplierOffers: [mapSupplierOffer(product)],
    pricing: mapPricing(product),
    stock: mapStock(product),
    availability: [],
    seo: mapSeo(product),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    _source: product,
  };
}

export function toBuzzardProduct(engine: ProductEngineProduct): BuzzardProduct {
  const de = engine.translations.find((t) => t.locale.startsWith("de")) ?? engine.translations[0];
  const primaryOffer = engine.supplierOffers[0];
  const slug = engine.seo.find((s) => s.locale.startsWith("de"))?.slug ?? engine.productId;
  return {
    id: engine.productId,
    sku: engine.sku,
    ean_gtin: engine.ean || engine.gtin || "",
    brand: engine.brand,
    manufacturer: engine.manufacturer,
    name: de?.name || engine.productId,
    short_description: de?.shortDescription || "",
    description: de?.description || "",
    category_id: engine.categoryId,
    category_ids: engine.subcategoryId ? [engine.categoryId, engine.subcategoryId] : [engine.categoryId],
    images: engine.images.map((i) => i.url),
    documents: [],
    attributes: Object.fromEntries(
      Object.entries(engine.technicalData).map(([k, v]) => [k, String(v)])
    ),
    variants: [],
    price: { amount: engine.pricing.customerPrice, currency: engine.pricing.currency },
    compare_at_price: null,
    vat_rate: engine.pricing.vat * 100,
    stock: engine.stock.quantity,
    stock_status:
      engine.stock.availability === "OUT_OF_STOCK"
        ? "out_of_stock"
        : engine.stock.availability === "LOW_STOCK"
          ? "low_stock"
          : "in_stock",
    supplier_id: primaryOffer?.supplierId || "",
    supplier_sku: primaryOffer?.supplierSku || "",
    supplier_price: {
      amount: primaryOffer?.supplierPrice ?? engine.pricing.supplierCost,
      currency: primaryOffer?.currency ?? engine.pricing.currency,
    },
    shipping: {
      weight_kg: engine.weight ?? 0,
      length_cm: engine.dimensions?.length ?? 0,
      width_cm: engine.dimensions?.width ?? 0,
      height_cm: engine.dimensions?.height ?? 0,
      class: "standard",
    },
    seo: {
      slug,
      title: de?.seoTitle || de?.name || "",
      description: de?.seoDescription || de?.shortDescription || "",
    },
    status:
      engine.status === "ACTIVE" || engine.status === "OUT_OF_STOCK"
        ? "active"
        : engine.status === "PAUSED"
          ? "paused"
          : engine.status === "ARCHIVED" || engine.status === "DISCONTINUED"
            ? "archived"
            : "draft",
    vehicle_compatibility: engine.compatibility.map((c) => ({
      brand: c.make,
      model: c.model,
      engine: c.engine,
      year_from: c.yearFrom,
      year_to: c.yearTo,
      part_reference: c.oemNumbers?.[0],
    })),
    created_at: engine.createdAt,
    updated_at: engine.updatedAt,
  };
}
