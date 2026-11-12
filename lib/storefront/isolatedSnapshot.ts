import raw from "@/data/storefront/isolated-public-snapshot.json";

export type IsolatedChrome = {
  locale: string;
  dir: "ltr" | "rtl";
  strings: Record<string, string>;
  provenance: string;
  review?: string;
  humanReviewed?: boolean;
};

export type IsolatedCard = {
  id: string;
  sku: string;
  title: string | null;
  description?: string | null;
  brand: string;
  manufacturer: string;
  category: { code: string; name: string };
  price: string;
  shipping: string;
  availability: string;
  returns: string;
  photograph: string;
  status: string;
  translationStatus?: string;
  sourceLocale?: string;
  breadcrumb?: Array<{ code: string; name: string }>;
  quoteCode?: string;
};

export type IsolatedSnapshot = {
  selected: string;
  sales: string;
  locales: IsolatedChrome[];
  itemsByLocale: Record<string, IsolatedCard[]>;
  detailByLocale: Record<string, Record<string, IsolatedCard>>;
  ids: string[];
};

const snapshot = raw as IsolatedSnapshot;

export function isolatedCatalogActive() {
  return process.env.NEXT_PUBLIC_BUZZARD_ISOLATED_CATALOG === "1" && snapshot.selected === "ISOLATED";
}

export function getIsolatedSnapshot() {
  return snapshot;
}

/** Read-only storefront view. The PIM reader is not imported: it opens the development database. */
export function readIsolatedStorefront(locale: string) {
  if (!isolatedCatalogActive()) {
    return { selected: "EXISTING_SAFE" as const, useExistingReader: true, openedDevDb: false, items: [] as IsolatedCard[] };
  }
  const code = snapshot.locales.some((item) => item.locale === locale) ? locale : "de";
  const chrome = snapshot.locales.find((item) => item.locale === code);
  return {
    selected: "ISOLATED" as const,
    useExistingReader: false,
    openedDevDb: false,
    locale: code,
    review: chrome?.review || "UNREVIEWED",
    humanReviewed: false,
    items: snapshot.itemsByLocale[code] || [],
  };
}
