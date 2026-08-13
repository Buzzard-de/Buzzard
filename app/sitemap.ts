import type { MetadataRoute } from "next";
import { getAllCategoryStaticParams } from "@/lib/categories/service";
import { getProductStaticParams } from "@/lib/products";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { localizePath } from "@/lib/i18n/routing";
import { absoluteUrl } from "@/lib/seo/config";

export const dynamic = "force-static";

const STATIC_PAGES = ["/", "/products/", "/impressum/", "/datenschutz/"];

function localizedEntries(path: string, priority = 0.7): MetadataRoute.Sitemap {
  return SUPPORTED_LOCALES.map((locale) => ({
    url: absoluteUrl(localizePath(path, locale)),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of STATIC_PAGES) {
    entries.push(...localizedEntries(page, page === "/" ? 1 : 0.6));
  }

  for (const { slug } of getProductStaticParams()) {
    entries.push(
      ...localizedEntries(`/produkt/${slug}/`, 0.8)
    );
  }

  for (const { slug } of getAllCategoryStaticParams()) {
    entries.push(
      ...localizedEntries(`/kategori/${slug.join("/")}/`, 0.7)
    );
  }

  return entries;
}
