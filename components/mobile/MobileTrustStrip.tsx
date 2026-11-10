"use client";

import { useLocale } from "@/lib/i18n/context";

export default function MobileTrustStrip() {
  const { t } = useLocale();

  return (
    <ul className="buzzard-mobile-trust" aria-label={t("home.trust")}>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <path d="M3 12h13M13 6l7 6-7 6" />
            <path d="M3 7v10" />
          </svg>
        </span>
        {t("home.trustChoice")}
      </li>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </span>
        {t("home.trustInfo")}
      </li>
      <li>
        <span className="buzzard-mobile-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        </span>
        {t("home.trustSupport")}
      </li>
    </ul>
  );
}
