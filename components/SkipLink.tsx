"use client";

import { useLocale } from "@/lib/i18n/context";

export default function SkipLink() {
  const { t } = useLocale();
  return (
    <a href="#maincontent" className="skip-link">
      {t("a11y.skipToContent")}
    </a>
  );
}
