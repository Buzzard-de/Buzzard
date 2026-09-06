import { getGlobalCountry } from "@/lib/global/types";
import { SUPPORTED_LOCALES, type BuzzardLocale } from "@/lib/i18n/types";

const UI_LOCALES = new Set<BuzzardLocale>(SUPPORTED_LOCALES);

function asUiLocale(code: string | undefined): BuzzardLocale | null {
  if (!code) return null;
  const normalized = code.toLowerCase() as BuzzardLocale;
  return UI_LOCALES.has(normalized) ? normalized : null;
}

/**
 * Map a market country to the best available storefront UI locale (de/en/tr/ar).
 * Uses defaultLanguage first, then supportedLanguages, then fallbackLanguage.
 */
export function resolveUiLocaleForCountry(countryCode: string): BuzzardLocale {
  const country = getGlobalCountry(countryCode);
  if (!country) return "de";

  const fromDefault = asUiLocale(country.defaultLanguage);
  if (fromDefault) return fromDefault;

  for (const lang of country.supportedLanguages) {
    const match = asUiLocale(lang);
    if (match) return match;
  }

  const fromFallback = asUiLocale(country.fallbackLanguage);
  if (fromFallback) return fromFallback;

  return "en";
}
