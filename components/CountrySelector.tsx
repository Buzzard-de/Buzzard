"use client";

import { getDeliverableMarketCountries } from "@/lib/market/countries";
import { useMarket } from "@/lib/market/context";
import { useLocale } from "@/lib/i18n/context";

export default function CountrySelector() {
  const { countryCode, setCountryCode } = useMarket();
  const { t } = useLocale();
  const countries = getDeliverableMarketCountries();

  return (
    <label className="country-selector">
      <span className="sr-only">{t("market.srLabel")}</span>
      <select
        value={countryCode}
        onChange={(e) => setCountryCode(e.target.value, true)}
        aria-label={t("market.label")}
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}
