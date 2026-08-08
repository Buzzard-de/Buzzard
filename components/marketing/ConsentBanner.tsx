"use client";

import { useEffect, useState } from "react";
import { defaultConsent, readConsent, saveConsent } from "@/lib/marketing/consent";

export default function ConsentBanner() {
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
    <div className="consent-banner" role="dialog" aria-label="Cookie-Einstellungen">
      <div className="consent-banner-inner">
        <p>
          Wir verwenden notwendige Technologien für den Shop-Betrieb. Analytics- und Marketing-Tools laden wir
          erst nach Ihrer Einwilligung.
        </p>
        <div className="consent-options">
          <label>
            <input type="checkbox" checked disabled /> Notwendig
          </label>
          <label>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            Analytics
          </label>
          <label>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            Marketing
          </label>
        </div>
        <div className="consent-actions">
          <button type="button" className="shop-btn-secondary" onClick={rejectOptional}>
            Nur notwendig
          </button>
          <button type="button" className="shop-btn-secondary" onClick={acceptSelected}>
            Auswahl speichern
          </button>
          <button type="button" className="shop-btn-primary" onClick={acceptAll}>
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
