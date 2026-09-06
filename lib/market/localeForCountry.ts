import { getMarketCountry } from "./countries";
import { SUPPORTED_LOCALES, type BuzzardLocale } from "@/lib/i18n/types";

const UI_LOCALES = new Set<BuzzardLocale>(SUPPORTED_LOCALES);

function asUiLocale(code: string | undefined): BuzzardLocale | null {
  if (!code) return null;
  const normalized = code.toLowerCase() as BuzzardLocale;
  return UI_LOCALES.has(normalized) ? normalized : null;
}

/**
 * Map a market country to the best available storefront UI locale (de/en/tr/ar).
 */
export function resolveUiLocaleForCountry(countryCode: string): BuzzardLocale {
  const country = getMarketCountry(countryCode);
  if (!country) return "de";

  const fromLanguage = asUiLocale(String(country.language));
  if (fromLanguage) return fromLanguage;

  if (country.rtl) return "ar";

  return "en";
}
