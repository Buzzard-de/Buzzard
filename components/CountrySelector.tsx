"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/i18n/context";
import { useGlobalLocale } from "@/lib/global/context";
import { listGlobalCountries } from "@/lib/global/types";
import { PREPARED_LANGUAGE_LABELS } from "@/lib/global/types";
import {
  countryCodeToFlag,
  getDefaultLanguageForCountry,
} from "@/lib/i18n/international/countryLocaleSwitch";
import { getLanguageOptionsForCountry } from "@/lib/i18n/international/config";

export default function CountrySelector() {
  const { t } = useLocale();
  const { country, setCountry } = useGlobalLocale();
  const countries = listGlobalCountries();

  const options = useMemo(
    () =>
      countries.map((entry) => {
        const localizedName = t(`country.${entry.countryCode}`);
        const name =
          localizedName !== `country.${entry.countryCode}`
            ? localizedName
            : entry.nativeCountryName || entry.countryName;
        const defaultLang = getDefaultLanguageForCountry(entry.countryCode);
        const langLabel = PREPARED_LANGUAGE_LABELS[defaultLang] ?? defaultLang;
        const multiLang = getLanguageOptionsForCountry(entry.countryCode).length > 1;
        return {
          code: entry.countryCode,
          label: `${countryCodeToFlag(entry.countryCode)} ${name} — ${langLabel}${multiLang ? " +" : ""}`,
        };
      }),
    [countries, t],
  );

  return (
    <label className="country-selector">
      <span className="sr-only">{t("market.srLabel")}</span>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value, true)}
        aria-label={t("market.label")}
      >
        {options.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}
