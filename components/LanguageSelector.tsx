"use client";

import { useLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/context";
import { useGlobalLocale } from "@/lib/global/context";
import { getLanguageOptionsForCountry } from "@/lib/i18n/international/config";
import { getDefaultLanguageForCountry } from "@/lib/i18n/international/countryLocaleSwitch";
import { PREPARED_LANGUAGE_LABELS } from "@/lib/global/types";
import { useEffect, useMemo } from "react";

export default function LanguageSelector() {
  const { locale, t } = useLocale();
  const { country, setLanguage } = useGlobalLocale();

  const options = useMemo(() => {
    const countryOptions = getLanguageOptionsForCountry(country);
    if (countryOptions.length > 0) return countryOptions;

    return SUPPORTED_LOCALES.map((code) => ({
      languageCode: code,
      nativeName: LOCALE_LABELS[code],
      locale: code,
      countryCode: country,
      countryName: country,
      direction: code === "ar" ? ("rtl" as const) : ("ltr" as const),
      uiReady: true,
    }));
  }, [country]);

  const selectedValue = useMemo(() => {
    const match = options.find((o) => o.languageCode === locale);
    return match?.locale ?? options[0]?.locale ?? locale;
  }, [locale, options]);

  useEffect(() => {
    const defaultLang = getDefaultLanguageForCountry(country);
    const stillSupported = options.some((o) => o.languageCode === locale);
    if (!stillSupported && defaultLang !== locale) {
      setLanguage(defaultLang, false);
    }
  }, [country, locale, options, setLanguage]);

  return (
    <label className="language-selector">
      <span className="sr-only">{t("language.srLabel")}</span>
      <select
        value={selectedValue}
        onChange={(e) => {
          const option = options.find((o) => o.locale === e.target.value);
          if (!option) return;
          setLanguage(option.languageCode, true);
        }}
        aria-label={t("language.label")}
      >
        {options.map((option) => (
          <option key={option.locale} value={option.locale}>
            {PREPARED_LANGUAGE_LABELS[option.languageCode] ?? option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
