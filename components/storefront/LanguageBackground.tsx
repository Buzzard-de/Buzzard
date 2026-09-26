"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/context";
import { getLanguageBackground } from "@/lib/backgrounds/languageBackgrounds";

const LANGUAGE_BACKGROUND_CLASS = "has-language-background";

export default function LanguageBackground() {
  const { locale } = useLocale();
  const src = getLanguageBackground(locale);

  useEffect(() => {
    const root = document.documentElement;
    if (src) root.classList.add(LANGUAGE_BACKGROUND_CLASS);
    else root.classList.remove(LANGUAGE_BACKGROUND_CLASS);
    return () => root.classList.remove(LANGUAGE_BACKGROUND_CLASS);
  }, [src]);

  if (!src) return null;

  return (
    <div className="language-page-background" aria-hidden="true">
      <img src={src} alt="" />
    </div>
  );
}
