import { listCountryConfigs } from "./config";
import type { AdminMarketRow } from "./types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";

export function getAdminMarketOverview(): AdminMarketRow[] {
  return listCountryConfigs().map((country) => {
    const variants = (country as { localeVariants?: Array<{ nativeName: string; languageCode: string; locale: string; isDefault?: boolean }> }).localeVariants ?? [];
    const primary = variants.find((v) => v.isDefault) ?? variants[0];
    const langCode = primary?.languageCode ?? country.defaultLanguage;
    const uiReady = SUPPORTED_LOCALES.includes(langCode as (typeof SUPPORTED_LOCALES)[number]);

    return {
      country: country.countryCode,
      countryName: country.nativeCountryName || country.countryName,
      language: primary?.languageCode ?? country.defaultLanguage,
      nativeName: primary?.nativeName ?? country.defaultLanguage,
      locale: primary?.locale ?? country.locale,
      currency: country.currency,
      status: country.enabled === false ? "DISABLED" : uiReady ? "ACTIVE" : "PREPARED",
    };
  });
}
