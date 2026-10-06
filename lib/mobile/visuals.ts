import {
  GERMANY_LANGUAGE_BACKGROUND,
  getLanguageBackground,
} from "@/lib/backgrounds/languageBackgrounds";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getProductsForCategory } from "@/lib/products";

export { GERMANY_LANGUAGE_BACKGROUND };

/** German-locale home hero only. Other locales keep their existing (no) photo. */
export function getMobileHeroPhoto(locale?: string | null): string | null {
  return getLanguageBackground(locale);
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
  coverImage?: string | null
): { backgroundImage?: string; backgroundPosition: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 100;
  }
  if (!coverImage) {
    return { backgroundPosition: "center" };
  }
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.08) 0%, rgba(8,8,8,0.45) 100%), url("${coverImage}")`,
    backgroundPosition: `${hash}% center`,
  };
}

/** Controlled overlay so white copy and the gold CTA stay readable on the Germany photo. */
export function getMobileHeroStyle(locale?: string | null): { backgroundImage?: string } | undefined {
  const photo = getMobileHeroPhoto(locale);
  if (!photo) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.10) 0%, rgba(8,8,8,0.28) 48%, rgba(8,8,8,0.55) 100%), url("${photo}")`,
  };
}
