import type { Metadata } from "next";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { hreflangAlternates, localizePath } from "@/lib/i18n/routing";
import type { PublicProduct } from "@/lib/products/types";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getCategoryLabel } from "@/lib/categories/i18n";
import { absoluteUrl, SEO_DEFAULTS, SITE_URL } from "./config";

export interface SeoOverride {
  title?: string;
  description?: string;
  canonical?: string;
  index?: boolean;
  follow?: boolean;
  sitemap?: boolean;
}

export function robotsFromOverride(override?: SeoOverride): Metadata["robots"] {
  if (!override) return { index: true, follow: true };
  return {
    index: override.index !== false,
    follow: override.follow !== false,
  };
}

export function buildProductMetadata(
  product: PublicProduct,
  locale: BuzzardLocale = "de",
  override?: SeoOverride
): Metadata {
  const title = override?.title || product.seo.title;
  const description = override?.description || product.seo.description;
  const canonicalPath = override?.canonical || localizePath(product.url, locale);
  const canonical = absoluteUrl(canonicalPath);
  const alternates = hreflangAlternates(product.url).reduce<Record<string, string>>((acc, alt) => {
    acc[alt.locale] = alt.href;
    return acc;
  }, {});

  return {
    title,
    description,
    alternates: { canonical, languages: alternates },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SEO_DEFAULTS.siteName,
      type: "website",
      locale: locale === "ar" ? "ar_SA" : `${locale}_${locale.toUpperCase()}`,
      images: product.images?.[0] ? [product.images[0]] : [`${SITE_URL}/logo/logo.png`],
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title,
      description,
    },
    robots: robotsFromOverride(override),
  };
}

export function buildCategoryMetadata(
  category: BuzzardCategory,
  locale: BuzzardLocale = "de",
  override?: SeoOverride
): Metadata {
  const name = getCategoryLabel(category, locale);
  const title = override?.title || `${name} – Kfz-Teile`;
  const description =
    override?.description ||
    `${name} bei Buzzard24 online entdecken – Kfz-Teile und Autoteile bei buzzard24.de. Große Auswahl, schnelle Lieferung.`;
  const path = category.url.endsWith("/") ? category.url : `${category.url}/`;
  const canonical = absoluteUrl(override?.canonical || localizePath(path, locale));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SEO_DEFAULTS.siteName,
      type: "website",
    },
    robots: robotsFromOverride(override),
  };
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}
