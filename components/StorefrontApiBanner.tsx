"use client";

import { useEffect, useState } from "react";
import { fetchApiHealth, type ApiHealthState } from "@/lib/api/health";
import { isApiConfigured } from "@/lib/api/config";

const DISMISS_KEY = "buzzard_storefront_api_banner_dismissed";

export default function StorefrontApiBanner() {
  const [state, setState] = useState<ApiHealthState>("checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) {
      setState("unconfigured");
      return;
    }

    let cancelled = false;
    fetchApiHealth().then((snapshot) => {
      if (!cancelled) setState(snapshot.state);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (dismissed || state === "checking" || state === "live" || state === "unconfigured") {
    return null;
  }

  return (
    <div className="storefront-api-banner" role="status">
      <p>
        <strong>Katalogmodus:</strong> Einige Funktionen (Bewertungen, Konto-Sync) werden aktiv, sobald
        unser Backend online ist. Produkte und Navigation funktionieren weiterhin.
      </p>
      <button type="button" className="storefront-api-banner-dismiss" onClick={dismiss} aria-label="Hinweis schließen">
        ×
      </button>
    </div>
  );
}
