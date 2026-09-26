"use client";

import { useLocale } from "@/lib/i18n/context";
import { getLanguageBackground } from "@/lib/backgrounds/languageBackgrounds";

export default function LanguageBackground() {
  const { locale } = useLocale();
  const src = getLanguageBackground(locale);

  if (!src) return null;

  return (
    <div className="language-page-background" aria-hidden="true">
      <img src={src} alt="" />
    </div>
  );
}
