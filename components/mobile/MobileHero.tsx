"use client";

import Link from "next/link";
import { getMobileStorefrontPhoto } from "@/lib/mobile/visuals";
import { useLocale } from "@/lib/i18n/context";

export default function MobileHero() {
  const { locale, t } = useLocale();
  const photo = getMobileStorefrontPhoto(locale);

  return (
    <section
      className="buzzard-mobile-hero"
      aria-label={t("mobile.heroAria")}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.18) 0%, rgba(8,8,8,0.74) 100%), url("${photo}")`,
      }}
    >
      <h1>{t("mobile.heroTitle")}</h1>
      <p>{t("mobile.heroText")}</p>
      <Link href="/products/" className="buzzard-mobile-hero-cta">
        {t("mobile.startShopping")}
      </Link>
    </section>
  );
}
