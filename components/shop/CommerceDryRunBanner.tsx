"use client";

import { useLocale } from "@/lib/i18n/context";
import { isCatalogMode, isCommerceDryRun } from "@/lib/shop/mode";

export default function CommerceDryRunBanner() {
  const { t } = useLocale();

  if (isCatalogMode()) {
    return (
      <div className="commerce-dry-run-banner catalog-mode-banner" role="status">
        <p>{t("catalog.cartNotice")}</p>
      </div>
    );
  }

  if (!isCommerceDryRun()) return null;

  return (
    <div className="commerce-dry-run-banner" role="status">
      <p>{t("commerce.dryRunBanner")}</p>
    </div>
  );
}
