"use client";

import { useLocale } from "@/lib/i18n/context";
import { SKIP_LINK_CLASS, SKIP_LINK_HREF } from "@/lib/a11y/landmarks";

export default function SkipLink() {
  const { t } = useLocale();
  return (
    <a href={SKIP_LINK_HREF} className={SKIP_LINK_CLASS}>
      {t("a11y.skipToContent")}
    </a>
  );
}
