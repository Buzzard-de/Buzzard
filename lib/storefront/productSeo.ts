import { LANGUAGE_CODES, isRtlLanguage } from "@/lib/i18n/languages";
import { localizePath } from "@/lib/i18n/routing";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { absoluteUrl } from "@/lib/seo/config";
import { storefrontString } from "@/lib/i18n/translations";
import { getIsolatedSnapshot, type IsolatedCard } from "./isolatedSnapshot";

const SAFE_TITLE = "Buzzard";

export type ProductSeo = {
  ok: boolean;
  status: "PRESENT" | "MISSING_TRANSLATION" | "LOCALE_REJECTED";
  title: string;
  description: string;
  locale: string;
  dir: "ltr" | "rtl";
  provenance: string;
  review: "UNREVIEWED";
  humanReviewed: false;
  canonical: string;
};

function rowFor(id: string, locale: string): IsolatedCard | undefined {
  return getIsolatedSnapshot().detailByLocale[id]?.[locale];
}

export function isolatedProductSeo(id: string, locale: string): ProductSeo {
  const known = (LANGUAGE_CODES as readonly string[]).includes(locale);
  const dir = isRtlLanguage(locale) ? "rtl" : "ltr";
  const canonical = absoluteUrl(localizePath(`/katalog/urun/${id}/`, (known ? locale : "de") as BuzzardLocale));
  if (!known || locale.includes("<") || locale.includes(">") || locale.includes("/") || locale.includes("\\")) {
    return {
      ok: false,
      status: "LOCALE_REJECTED",
      title: SAFE_TITLE,
      description: SAFE_TITLE,
      locale: "de",
      dir: "ltr",
      provenance: "ABSENT",
      review: "UNREVIEWED",
      humanReviewed: false,
      canonical: absoluteUrl(localizePath(`/katalog/urun/${id}/`, "de" as BuzzardLocale)),
    };
  }
  const row = rowFor(id, locale);
  if (row?.translationStatus === "PRESENT" && row.title) {
    const source = row.sourceLocale === locale;
    return {
      ok: true,
      status: "PRESENT",
      title: row.title,
      description: row.description || SAFE_TITLE,
      locale,
      dir,
      provenance: source ? "SOURCE_DE" : "UNREVIEWED_CATALOG",
      review: "UNREVIEWED",
      humanReviewed: false,
      canonical,
    };
  }
  return {
    ok: false,
    status: "MISSING_TRANSLATION",
    title: SAFE_TITLE,
    description: SAFE_TITLE,
    locale,
    dir,
    provenance: "ABSENT",
    review: "UNREVIEWED",
    humanReviewed: false,
    canonical: absoluteUrl(localizePath(`/katalog/urun/${id}/`, "de" as BuzzardLocale)),
  };
}

export function isolatedHreflang(id: string) {
  const links = (LANGUAGE_CODES as readonly string[])
    .map((locale) => isolatedProductSeo(id, locale))
    .filter((seo) => seo.status === "PRESENT")
    .map((seo) => ({ locale: seo.locale, href: seo.canonical }));
  const hrefs = links.map((link) => link.href);
  return { links, duplicateCanonicals: new Set(hrefs).size !== hrefs.length };
}

/** Listing SEO uses the German source string. Machine drafts stay out of the title. */
export function listingSeo(locale: string) {
  const row = storefrontString(locale, "catalog.pageTitle");
  const lead = storefrontString(locale, "catalog.pageLead");
  if (row.provenance === "SOURCE_DE" && row.status === "PRESENT") {
    return { title: row.text, description: lead.text, status: "PRESENT" as const, provenance: row.provenance, review: "UNREVIEWED" as const, humanReviewed: false };
  }
  return { title: SAFE_TITLE, description: SAFE_TITLE, status: "MISSING_VERIFIED_TRANSLATION" as const, provenance: row.provenance, review: "UNREVIEWED" as const, humanReviewed: false };
}
