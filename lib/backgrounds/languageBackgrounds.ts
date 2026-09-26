export const GERMANY_LANGUAGE_BACKGROUND =
  "/images/backgrounds/germany/buzzard-germany-de.png";

/**
 * Language-keyed page backgrounds. Country is never consulted.
 * Only `de` is active. Other languages stay on the existing default.
 */
export const LANGUAGE_BACKGROUNDS: Record<string, string> = {
  de: GERMANY_LANGUAGE_BACKGROUND,
  // ileride:
  // fr: "/images/backgrounds/france/buzzard-france-fr.png",
  // it: "/images/backgrounds/italy/buzzard-italy-it.png",
  // es: "/images/backgrounds/spain/buzzard-spain-es.png",
  // tr: "/images/backgrounds/turkey/buzzard-turkey-tr.png",
};

export function normalizeLanguage(locale: string | null | undefined): string {
  if (!locale) return "";
  const normalized = String(locale).trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return "";
  return normalized.split("-")[0] ?? "";
}

export function getLanguageBackground(locale: string | null | undefined): string | null {
  const language = normalizeLanguage(locale);
  if (!language) return null;
  return LANGUAGE_BACKGROUNDS[language] ?? null;
}
