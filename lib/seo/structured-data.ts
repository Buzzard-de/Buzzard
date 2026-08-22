import type { BuzzardCategory } from "@/lib/categories/types";
import { getCategoryLabel } from "@/lib/categories/i18n";
import type { BuzzardLocale } from "@/lib/i18n/types";
import type { PublicProduct } from "@/lib/products/types";
import { absoluteUrl, SEO_DEFAULTS, SITE_URL } from "./config";
import { CONTACT_EMAIL } from "@/lib/site/contact";
import { showPrices } from "@/lib/shop/mode";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_DEFAULTS.siteName,
    legalName: SEO_DEFAULTS.legalName,
    alternateName: SEO_DEFAULTS.alternateNames,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: CONTACT_EMAIL,
      availableLanguage: ["de", "en", "tr", "ar"],
    },
  };
}

export function onlineStoreSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: SEO_DEFAULTS.siteName,
    alternateName: SEO_DEFAULTS.alternateNames,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/logo.png`,
    image: `${SITE_URL}/logo/logo.png`,
    inLanguage: ["de-DE", "en", "tr", "ar"],
    areaServed: {
      "@type": "Country",
      name: "Germany",
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_DEFAULTS.siteName,
    alternateName: SEO_DEFAULTS.alternateNames,
    url: SITE_URL,
    inLanguage: ["de-DE", "en", "tr", "ar"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
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

export function productSchema(product: PublicProduct, categoryLabel: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absoluteUrl(product.url),
    description: product.shortDescription || product.description,
    sku: product.sku,
    ...(product.eanGtin ? { gtin13: product.eanGtin } : {}),
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    category: categoryLabel,
    ...(showPrices()
      ? {
          offers: {
            "@type": "Offer",
            url: absoluteUrl(product.url),
            priceCurrency: "EUR",
            price: product.price.toFixed(2),
            availability:
              product.stockStatus === "out_of_stock"
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

export function categoryCollectionSchema(
  category: BuzzardCategory,
  locale: BuzzardLocale,
  description: string
) {
  const name = getCategoryLabel(category, locale);
  const path = category.url.endsWith("/") ? category.url : `${category.url}/`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SEO_DEFAULTS.siteName,
      url: SITE_URL,
    },
  };
}

export function categoryBreadcrumbItems(
  breadcrumb: BuzzardCategory[],
  locale: BuzzardLocale
): Array<{ name: string; url?: string }> {
  return [
    { name: "Startseite", url: "/" },
    ...breadcrumb.map((crumb) => ({
      name: getCategoryLabel(crumb, locale),
      url: crumb.url,
    })),
  ];
}
