import type { BuzzardCategory } from "@/lib/categories/types";
import { getCategoryLabel } from "@/lib/categories/i18n";
import type { BuzzardLocale } from "@/lib/i18n/types";
import type { PublicProduct } from "@/lib/products/types";
import { absoluteUrl, SITE_URL } from "./config";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Buzzard",
    url: SITE_URL,
    logo: `${SITE_URL}/logo/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["de", "en", "tr", "ar"],
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Buzzard",
    url: SITE_URL,
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
    description: product.shortDescription || product.description,
    sku: product.sku,
    ...(product.eanGtin ? { gtin13: product.eanGtin } : {}),
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    category: categoryLabel,
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
