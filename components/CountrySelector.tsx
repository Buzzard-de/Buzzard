"use client";

import { getDeliverableMarketCountries } from "@/lib/market/countries";
import { useMarket } from "@/lib/market/context";
import { useLocale } from "@/lib/i18n/context";

export default function CountrySelector() {
  const { countryCode, setCountryCode } = useMarket();
  const { t, setLocale } = useLocale();
  const countries = getDeliverableMarketCountries();

  function applyCountry(code: string) {
    setCountryCode(code, true);
    if (code.toUpperCase() === "DE") {
      setLocale("de", true);
    }
  }

  return (
    <label className="country-selector">
      <span className="sr-only">{t("market.srLabel")}</span>
      <select
        value={countryCode}
        onChange={(e) => applyCountry(e.target.value)}
        onPointerUp={() => {
          if (countryCode === "DE") applyCountry("DE");
        }}
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
