"use client";

import CountrySelector from "@/components/CountrySelector";
import LanguageSelector from "@/components/LanguageSelector";
import { LOCALE_LABELS, useLocale } from "@/lib/i18n/context";
import { getDeliverableMarketCountries } from "@/lib/market/countries";
import { useMarket } from "@/lib/market/context";

export default function MobileLocaleMarketBar() {
  const { locale, t } = useLocale();
  const { countryCode } = useMarket();
  const country = getDeliverableMarketCountries().find((market) => market.code === countryCode);

  return (
    <div className="mobile-home-locale-market" aria-label={`${t("language.srLabel")} · ${t("market.srLabel")}`}>
      <div className="mobile-home-locale-control">
        <span className="mobile-home-locale-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
          </svg>
          {t("language.srLabel")}
        </span>
        <span className="mobile-home-locale-value" aria-hidden="true">{LOCALE_LABELS[locale]}</span>
        <LanguageSelector />
      </div>
      <div className="mobile-home-locale-control">
        <span className="mobile-home-locale-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {t("market.srLabel")}
        </span>
        <span className="mobile-home-locale-value" aria-hidden="true">
          {country ? `${country.flag} ${country.name}` : countryCode}
        </span>
        <CountrySelector />
      </div>
    </div>
  );
}
