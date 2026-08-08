import { SUPPORTED_LOCALES, type BuzzardLocale } from "./types";

export const STORAGE_KEY = "buzzard_locale";
export const MANUAL_OVERRIDE_KEY = "buzzard_locale_manual";

export function detectBrowserLocale(): BuzzardLocale {
  if (typeof navigator === "undefined") return "de";

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of languages) {
    const code = tag.slice(0, 2).toLowerCase();
    if (SUPPORTED_LOCALES.includes(code as BuzzardLocale)) {
      return code as BuzzardLocale;
    }
  }

  return "de";
}

export function readStoredLocale(): BuzzardLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as BuzzardLocale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasManualLocaleOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MANUAL_OVERRIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function detectLocale(): BuzzardLocale {
  if (hasManualLocaleOverride()) {
    return readStoredLocale() ?? "de";
  }
  return readStoredLocale() ?? detectBrowserLocale();
}

export function persistLocale(locale: BuzzardLocale, manual = false): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    localStorage.setItem(MANUAL_OVERRIDE_KEY, manual ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function localeFromPrefix(prefix: string | undefined): BuzzardLocale | null {
  if (!prefix) return null;
  return SUPPORTED_LOCALES.includes(prefix as BuzzardLocale) ? (prefix as BuzzardLocale) : null;
}
