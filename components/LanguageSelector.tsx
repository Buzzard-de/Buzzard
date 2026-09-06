"use client";

import { useLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/context";
import { PREPARED_LANGUAGE_LABELS } from "@/lib/global/types";
import { isRtlLocale, type BuzzardLocale } from "@/lib/i18n/types";
import { useGlobalLocale } from "@/lib/global/context";

const PREVIEW_LANGUAGES = ["fr", "it", "es", "nl", "pl"] as const;

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  const { country, uiReady } = useGlobalLocale();

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
            {isRtlLocale(code) ? " (RTL)" : ""}
          </option>
        ))}
        {PREVIEW_LANGUAGES.map((code) => (
          <option key={code} value={code} disabled>
            {PREPARED_LANGUAGE_LABELS[code]} ({country})
          </option>
        ))}
      </select>
      {!uiReady ? <span className="language-selector__hint">UI: {locale}</span> : null}
    </label>
  );
}
