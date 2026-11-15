export const GERMANY_LANGUAGE_BACKGROUND =
  "/images/backgrounds/germany/buzzard-germany-de.png";

/**
 * Language-keyed page backgrounds. Country is never consulted.
 * Only `de` is active.
 */
export const LANGUAGE_BACKGROUNDS: Record<string, string> = {
  de: GERMANY_LANGUAGE_BACKGROUND,
};

export function normalizeLanguage(locale: string | null | undefined): string {
  if (!locale) return "";
  const normalized = String(locale).trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return "";
  return normalized.split("-")[0] ?? "";
}

export function getLanguageBackground(locale: string | null | undefined): string | null {
  const language = normalizeLanguage(locale);
  if (language !== "de") return null;
  return LANGUAGE_BACKGROUNDS.de ?? null;
}
