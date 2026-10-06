"use client";

import { useLocale } from "@/lib/i18n/context";

export default function MobileTrustStrip() {
  const { t } = useLocale();

  return (
    <ul className="buzzard-mobile-trust" aria-label={t("home.trust")}>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">⚡</span>
        {t("mobile.trustFast")}
      </li>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">↩</span>
        {t("mobile.trustReturn")}
      </li>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">🔒</span>
        {t("mobile.trustPay")}
      </li>
    </ul>
  );
}
