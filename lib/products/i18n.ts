import type { BuzzardLocale } from "@/lib/i18n/types";
import type { BuzzardProduct, PublicProduct } from "./types";
import translations from "@/data/buzzard_product_translations.json";

type ProductTranslation = {
  name?: string;
  short_description?: string;
  description?: string;
  seo?: { title?: string; description?: string };
};

const catalog = translations as Record<string, Partial<Record<BuzzardLocale, ProductTranslation>>>;

function getTranslation(productId: string, locale: BuzzardLocale): ProductTranslation | undefined {
  if (locale === "de") return undefined;
  return catalog[productId]?.[locale];
}

export function localizeProduct(product: BuzzardProduct, locale: BuzzardLocale): BuzzardProduct {
  const entry = getTranslation(product.id, locale);
  if (!entry) return product;

  return {
    ...product,
    name: entry.name ?? product.name,
    short_description: entry.short_description ?? product.short_description,
    description: entry.description ?? product.description,
    seo: {
      ...product.seo,
      title: entry.seo?.title ?? product.seo.title,
      description: entry.seo?.description ?? product.seo.description,
    },
  };
}

export function localizePublicProduct(product: PublicProduct, locale: BuzzardLocale): PublicProduct {
  const entry = getTranslation(product.id, locale);
  if (!entry) return product;

  return {
    ...product,
    name: entry.name ?? product.name,
    shortDescription: entry.short_description ?? product.shortDescription,
    description: entry.description ?? product.description,
    seo: {
      ...product.seo,
      title: entry.seo?.title ?? product.seo.title,
      description: entry.seo?.description ?? product.seo.description,
    },
  };
}
