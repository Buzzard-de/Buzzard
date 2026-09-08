import { listCountryConfigs } from "./config";
import type { AdminMarketRow } from "./types";

export function getAdminMarketOverview(): AdminMarketRow[] {
  return listCountryConfigs().map((country) => {
    const variants = (country as { localeVariants?: Array<{ nativeName: string; languageCode: string; locale: string; isDefault?: boolean }> }).localeVariants ?? [];
    const primary = variants.find((v) => v.isDefault) ?? variants[0];
    const uiReady = ["de", "en", "tr", "ar"].includes(primary?.languageCode ?? country.defaultLanguage);

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
