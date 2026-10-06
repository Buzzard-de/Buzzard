import {
  GERMANY_LANGUAGE_BACKGROUND,
  getLanguageBackground,
} from "@/lib/backgrounds/languageBackgrounds";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getProductsForCategory } from "@/lib/products";

/** Existing Buzzard storefront photography — not a second catalog or demo SKU. */
export function getMobileStorefrontPhoto(locale?: string | null): string {
  return getLanguageBackground(locale) ?? GERMANY_LANGUAGE_BACKGROUND;
}

export function getCategoryCoverImage(category: BuzzardCategory): string | null {
  const products = getProductsForCategory(category, 12);
  for (const product of products) {
    const src = product.images[0];
    if (src && !src.includes("product-placeholder")) return src;
  }
  return null;
}

export function getMobileCoverStyle(
  seed: string,
  locale?: string | null,
  coverImage?: string | null
): { backgroundImage: string; backgroundPosition: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 100;
  }
  const photo = coverImage || getMobileStorefrontPhoto(locale);
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.08) 0%, rgba(8,8,8,0.55) 100%), url("${photo}")`,
    backgroundPosition: `${hash}% center`,
  };
}
