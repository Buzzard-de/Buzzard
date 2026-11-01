import supported from "./supported-locales.json";

export const LANGUAGE_CODES = supported as readonly string[];

export const LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  fr: "Français",
  nl: "Nederlands",
  bg: "Български",
  hr: "Hrvatski",
  el: "Ελληνικά",
  cs: "Čeština",
  da: "Dansk",
  et: "Eesti",
  fi: "Suomi",
  hu: "Magyar",
  it: "Italiano",
  lv: "Latviešu",
  lt: "Lietuvių",
  lb: "Lëtzebuergesch",
  mt: "Malti",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  sk: "Slovenčina",
  sl: "Slovenščina",
  es: "Español",
  ca: "Català",
  eu: "Euskara",
  gl: "Galego",
  sv: "Svenska",
  ga: "Gaeilge",
};

export const ROUTING_LOCALES = ["de", "en", "tr", "ar"] as const;

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGE_CODES.includes(code);
}
