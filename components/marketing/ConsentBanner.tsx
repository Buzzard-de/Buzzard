"use client";

import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/marketing/consent";
import { useLocale } from "@/lib/i18n/context";

export default function ConsentBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState("BLOCKED");

  useEffect(() => {
    const current = readConsent();
    setVisible(!current);
    if (current?.marketing_tracking) setTrackingStatus(current.marketing_tracking === "UNKNOWN" ? "BLOCKED" : current.marketing_tracking);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    const current = readConsent();
    if (current?.marketing_tracking === "WITHDRAWN" && current.trackingWithdrawal) {
      saveConsent({
        analytics: true,
        marketing: false,
        marketingTracking: "WITHDRAWN",
        trackingWithdrawal: current.trackingWithdrawal,
      });
      setTrackingStatus("WITHDRAWN");
    } else {
      saveConsent({ analytics: true, marketing: false, marketingTracking: "BLOCKED" });
      setTrackingStatus("BLOCKED");
    }
    setVisible(false);
  }

  function acceptSelected() {
    saveConsent({
      analytics,
      marketing: false,
      marketingTracking: trackingStatus === "WITHDRAWN" ? "WITHDRAWN" : "BLOCKED",
    });
    setVisible(false);
  }

  function rejectOptional() {
    const saved = saveConsent({ analytics: false, marketing: false, marketingTracking: "WITHDRAWN" });
    setTrackingStatus(saved.marketing_tracking);
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
            <input type="checkbox" checked={false} disabled readOnly /> {t("consent.marketing")} marketing_tracking {trackingStatus}
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
