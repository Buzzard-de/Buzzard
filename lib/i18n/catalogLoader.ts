import type { BuzzardLanguageCode } from "./types";
import type { TranslationTree } from "./types-catalog";
import { getCatalog, loadLocale as loadLocaleFromCatalogs } from "./translations";
import { resolveLanguageFromLocaleTag, SUPPORTED_LOCALES } from "./types";

export type { TranslationTree };

/** Load catalog by BCP-47 locale tag (e.g. fr-FR, pl-PL). */
export async function loadLocale(localeTag: string): Promise<TranslationTree> {
  const language = resolveLanguageFromLocaleTag(localeTag);
  return loadLocaleFromCatalogs(language);
}

export function loadLocaleSync(localeTag: string): TranslationTree {
  const language = resolveLanguageFromLocaleTag(localeTag);
  return getCatalog(language);
}

export function isCatalogLanguage(language: string): language is BuzzardLanguageCode {
  return SUPPORTED_LOCALES.includes(language as BuzzardLanguageCode);
}

export { getCatalog };
