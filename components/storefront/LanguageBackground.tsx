"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { getLanguageBackground } from "@/lib/backgrounds/languageBackgrounds";

const LANGUAGE_BACKGROUND_CLASS = "has-language-background";
const LANGUAGE_BACKGROUND_VAR = "--language-background-image";

export default function LanguageBackground() {
  const { locale } = useLocale();
  const { countryCode } = useMarket();
  const src = getLanguageBackground(locale, countryCode);

  useEffect(() => {
    const root = document.documentElement;
    if (src) {
      root.classList.add(LANGUAGE_BACKGROUND_CLASS);
      root.style.setProperty(LANGUAGE_BACKGROUND_VAR, `url("${src}")`);
    } else {
      root.classList.remove(LANGUAGE_BACKGROUND_CLASS);
      root.style.removeProperty(LANGUAGE_BACKGROUND_VAR);
    }
    return () => {
      root.classList.remove(LANGUAGE_BACKGROUND_CLASS);
      root.style.removeProperty(LANGUAGE_BACKGROUND_VAR);
    };
  }, [src]);

  return null;
}
