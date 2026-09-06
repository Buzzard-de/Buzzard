"use client";

import { useLocale } from "@/lib/i18n/context";
import { useGlobalLocale } from "@/lib/global/context";
import { listGlobalCountries } from "@/lib/global/types";

export default function CountrySelector() {
  const { t } = useLocale();
  const { country, setCountry } = useGlobalLocale();
  const countries = listGlobalCountries();

  return (
    <label className="country-selector">
      <span className="sr-only">{t("market.srLabel")}</span>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value, true)}
        aria-label={t("market.label")}
      >
        {countries.map((entry) => (
          <option key={entry.countryCode} value={entry.countryCode}>
            {entry.nativeCountryName} ({entry.countryCode})
          </option>
        ))}
      </select>
    </label>
  );
}
