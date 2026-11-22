import type { BuzzardLocale } from "@/lib/i18n/types";
import countryNames from "./country-names.json";

const names = countryNames.names as Record<string, Record<string, string>>;

/** Localized country name for the selector. The stored catalog name stays German. */
export function countryDisplayName(code: string, locale: BuzzardLocale | string): string {
  const row = names[code.toUpperCase()];
  if (!row) return code;
  return row[locale] || row.de || code;
}

export const EU_COUNTRY_CODES = countryNames.eu as readonly string[];
