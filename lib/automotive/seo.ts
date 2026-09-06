import type { Metadata } from "next";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { hreflangAlternates, localizePath } from "@/lib/i18n/routing";
import { absoluteUrl, SEO_DEFAULTS } from "@/lib/seo/config";
import type { AutomotiveCategoryNode } from "./service";
import { getAutomotiveCategoryLabel, getAutomotiveCategoryUrl } from "./service";

export function buildAutomotiveCategoryMetadata(
  category: AutomotiveCategoryNode,
  locale: BuzzardLocale = "de"
): Metadata {
  const name = getAutomotiveCategoryLabel(category, locale);
  const title = category.seo?.title?.[locale] || `${name} – Buzzard24`;
  const description =
    category.seo?.description?.[locale] ||
    `${name} — ${locale === "de" ? "Automobil-Katalog bei Buzzard24. Produkte und Unterkategorien online entdecken." : "Automotive catalog at Buzzard24. Browse products and subcategories online."}`;
  const path = getAutomotiveCategoryUrl(category);
  const canonical = absoluteUrl(localizePath(path, locale));
  const alternates = hreflangAlternates(path).reduce<Record<string, string>>((acc, alt) => {
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
    },
    robots: { index: true, follow: true },
  };
}

export function automotiveBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url ? absoluteUrl(item.url) : undefined,
    })),
  };
}

export function automotiveCollectionJsonLd(category: AutomotiveCategoryNode, locale: BuzzardLocale) {
  const name = getAutomotiveCategoryLabel(category, locale);
  const url = absoluteUrl(getAutomotiveCategoryUrl(category));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: SEO_DEFAULTS.siteName,
      url: absoluteUrl("/"),
    },
  };
}
