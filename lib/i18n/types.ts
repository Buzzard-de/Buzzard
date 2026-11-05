import { LANGUAGE_CODES, LANGUAGE_LABELS, isRtlLanguage } from "./languages";

export type BuzzardLocale = (typeof LANGUAGE_CODES)[number];

export const SUPPORTED_LOCALES: BuzzardLocale[] = [...LANGUAGE_CODES];

export const LOCALE_LABELS: Record<string, string> = { ...LANGUAGE_LABELS };

export const RTL_LOCALES: BuzzardLocale[] = LANGUAGE_CODES.filter((code) => isRtlLanguage(code));

export function isRtlLocale(locale: string): boolean {
  return isRtlLanguage(locale);
}
