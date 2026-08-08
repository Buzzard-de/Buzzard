"use client";

import { useLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/context";
import type { BuzzardLocale } from "@/lib/i18n/types";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="language-selector">
      <span className="sr-only">{t("language.srLabel")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as BuzzardLocale, true)}
        aria-label={t("language.label")}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
