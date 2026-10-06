import { getMarketLanguages } from "@/lib/market-engine";
import { resolveLanguage, toBuzzardUiLocale } from "@/lib/i18n/international/resolveLanguage";
import type { BuzzardLanguageCode } from "@/lib/i18n/types";

/**
 * Keep the current UI language when the market still supports it.
 * Otherwise apply the Market Engine / international fallback (country default, then English).
 */
export function resolveLocaleAfterMarketChange(
  currentLocale: BuzzardLanguageCode,
  countryCode: string
): BuzzardLanguageCode {
  const supported = getMarketLanguages(countryCode);
  if (supported.includes(currentLocale)) return currentLocale;

  const resolved = resolveLanguage({
    explicitCountryCode: countryCode,
    explicitLanguage: currentLocale,
    manualOverride: false,
    savedManualOverride: false,
  });
  return toBuzzardUiLocale(resolved.languageCode);
}
