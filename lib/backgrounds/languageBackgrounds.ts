export const GERMANY_LANGUAGE_BACKGROUND =
  "/images/backgrounds/germany/buzzard-germany-de.png";

export const GERMANY_BACKGROUND_COUNTRY = "DE";

/**
 * Language backgrounds. Germany photo is active only for Deutsch + Deutschland.
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

export function normalizeCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  return String(countryCode).trim().toUpperCase();
}

/**
 * Germany background only when language is German AND country is Germany.
 * DE + en → null. IT + de → null. DE + de → asset.
 */
export function getLanguageBackground(
  locale: string | null | undefined,
  countryCode?: string | null
): string | null {
  const language = normalizeLanguage(locale);
  const country = normalizeCountry(countryCode);
  if (language !== "de") return null;
  if (country !== GERMANY_BACKGROUND_COUNTRY) return null;
  return LANGUAGE_BACKGROUNDS.de;
}
