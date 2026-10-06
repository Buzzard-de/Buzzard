"use client";

import { useLocale } from "@/lib/i18n/context";

export default function MobileTrustStrip() {
  const { t } = useLocale();

  return (
    <ul className="buzzard-mobile-trust" aria-label={t("home.trust")}>
      <li>{t("topBar.shipping")}</li>
      <li>{t("topBar.returns")}</li>
      <li>{t("topBar.trust")}</li>
    </ul>
  );
}
