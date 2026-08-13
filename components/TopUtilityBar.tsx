"use client";

import { useLocale } from "@/lib/i18n/context";
import { isSalesEnabled } from "@/lib/shop/mode";

export default function TopUtilityBar() {
  const { t } = useLocale();
  const salesOn = isSalesEnabled();

  return (
    <div className="top-bar" role="region" aria-label="Shop-Informationen">
      <div className="top-bar-inner">
        {salesOn ? (
          <>
            <span>
              <svg className="tb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              {t("topBar.shipping")}
            </span>
            <span>
              <svg className="tb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                <path d="M3 7h13l3 5v5a1 1 0 01-1 1h-1" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
              </svg>
              {t("topBar.returns")}
            </span>
            <span className="tp-stars">
              <strong>★★★★★</strong> {t("topBar.trust")}
            </span>
          </>
        ) : (
          <>
            <span>{t("topBar.catalogPreview")}</span>
            <span>{t("topBar.catalogCategories")}</span>
            <span>{t("topBar.catalogSupport")}</span>
          </>
        )}
      </div>
    </div>
  );
}
