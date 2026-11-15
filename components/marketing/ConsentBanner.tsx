"use client";

import { useEffect, useState } from "react";
import { defaultConsent, readConsent, saveConsent } from "@/lib/marketing/consent";
import { useLocale } from "@/lib/i18n/context";

export default function ConsentBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setVisible(!readConsent());
  }, []);

  if (!visible) return null;

  function acceptAll() {
    saveConsent({ analytics: true, marketing: true });
    setVisible(false);
  }

  function acceptSelected() {
    saveConsent({ analytics, marketing });
    setVisible(false);
  }

  function rejectOptional() {
    saveConsent(defaultConsent());
    setVisible(false);
  }

  return (
    <div className="consent-banner" role="dialog" aria-label={t("consent.aria")}>
      <div className="consent-banner-inner">
        <p>{t("consent.text")}</p>
        <div className="consent-options">
          <label>
            <input type="checkbox" checked disabled /> {t("consent.necessary")}
          </label>
          <label>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            {t("consent.analytics")}
          </label>
          <label>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            {t("consent.marketing")}
          </label>
        </div>
        <div className="consent-actions">
          <button type="button" className="shop-btn-secondary" onClick={rejectOptional}>
            {t("consent.onlyNecessary")}
          </button>
          <button type="button" className="shop-btn-secondary" onClick={acceptSelected}>
            {t("consent.save")}
          </button>
          <button type="button" className="shop-btn-primary" onClick={acceptAll}>
            {t("consent.acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
