"use client";

import { useLocale } from "@/lib/i18n/context";
import { isCommerceDryRun } from "@/lib/shop/mode";

export default function CommerceDryRunBanner() {
  const { t } = useLocale();
  if (!isCommerceDryRun()) return null;

  return (
    <div className="commerce-dry-run-banner" role="status">
      <p>
        {t("commerce.dryRunBanner") ||
          "Testmodus — Kein echter Verkauf. Bestellungen werden als Test/Readiness gespeichert (BUZZARD_SALES_ENABLED=0)."}
      </p>
    </div>
  );
}
