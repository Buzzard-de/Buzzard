"use client";

import Link from "next/link";
import { getLanguageBackground } from "@/lib/backgrounds/languageBackgrounds";
import { useLocale } from "@/lib/i18n/context";

export default function MobileHero() {
  const { locale, t } = useLocale();
  const photo = getLanguageBackground(locale);

  return (
    <section
      className="buzzard-mobile-hero"
      aria-label={t("mobile.heroAria")}
      style={
        photo
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.72) 100%), url("${photo}")`,
            }
          : undefined
      }
    >
      <h1>{t("mobile.heroTitle")}</h1>
      <p>{t("mobile.heroText")}</p>
      <Link href="/products/" className="buzzard-mobile-hero-cta">
        {t("mobile.startShopping")}
      </Link>
    </section>
  );
}
