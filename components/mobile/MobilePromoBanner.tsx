"use client";

import Link from "next/link";
import { HOME_CATALOG_HREF } from "@/lib/home/homepageContent";
import { useLocale } from "@/lib/i18n/context";

export default function MobilePromoBanner() {
  const { t } = useLocale();

  return (
    <Link href={HOME_CATALOG_HREF} className="buzzard-mobile-promo">
      <strong>{t("home.campaigns")}</strong>
      <span>{t("hero.secondary")}</span>
    </Link>
  );
}
