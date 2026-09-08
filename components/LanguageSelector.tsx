"use client";

import { useLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { getLanguageOptionsForCountry } from "@/lib/i18n/international/config";
import { toBuzzardUiLocale } from "@/lib/i18n/international/resolveLanguage";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { persistMarketLocale, readStoredMarketLocale } from "@/lib/i18n/detect";
import { useEffect, useMemo, useState } from "react";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  const { countryCode } = useMarket();
  const [selectedLocale, setSelectedLocale] = useState<string>(locale);

  const options = useMemo(() => {
    const countryOptions = getLanguageOptionsForCountry(countryCode);
    if (countryOptions.length > 0) return countryOptions;

    return SUPPORTED_LOCALES.map((code) => ({
      languageCode: code,
      nativeName: LOCALE_LABELS[code],
      locale: code,
      countryCode,
      countryName: countryCode,
      direction: code === "ar" ? ("rtl" as const) : ("ltr" as const),
      uiReady: true,
    }));
  }, [countryCode]);

  useEffect(() => {
    const stored = readStoredMarketLocale();
    const match = options.find((o) => o.languageCode === locale);
    setSelectedLocale(stored ?? match?.locale ?? locale);
  }, [locale, options]);

  return (
    <label className="language-selector">
      <span className="sr-only">{t("language.srLabel")}</span>
      <select
        value={selectedLocale}
        onChange={(e) => {
          const option = options.find((o) => o.locale === e.target.value);
          if (!option) return;
          setSelectedLocale(option.locale);
          persistMarketLocale(option.locale, true);
          setLocale(toBuzzardUiLocale(option.languageCode) as BuzzardLocale, true);
        }}
        aria-label={t("language.label")}
      >
        {options.map((option) => (
          <option key={option.locale} value={option.locale}>
            {option.nativeName} — {option.countryName} ({option.locale})
          </option>
        ))}
      </select>
    </label>
  );
}
