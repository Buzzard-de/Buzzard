import type { BuzzardLocale } from "./types";
import type { TranslationTree } from "./types-catalog";
import { catalog as de } from "./locales/de";
import { catalog as en } from "./locales/en";
import { catalog as tr } from "./locales/tr";
import { catalog as ar } from "./locales/ar";

export type { TranslationTree };

const catalogs: Record<BuzzardLocale, TranslationTree> = { de, en, tr, ar };
const FALLBACK_CHAIN: BuzzardLocale[] = ["en", "de"];
const missingKeys = new Set<string>();

function resolve(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function logMissingTranslation(localeLabel: string, key: string): void {
  if (process.env.NODE_ENV !== "development" || missingKeys.has(`${localeLabel}:${key}`)) return;
  missingKeys.add(`${localeLabel}:${key}`);
  console.warn(`[BUZZARD i18n] Missing translation:\n${localeLabel}.${key}`);
}

export function translate(locale: BuzzardLocale, key: string, localeLabel?: string): string {
  const label = localeLabel ?? locale;
  const primary = resolve(catalogs[locale], key);
  if (primary) return primary;

  for (const fallback of FALLBACK_CHAIN) {
    if (fallback === locale) continue;
    const value = resolve(catalogs[fallback], key);
    if (value) {
      logMissingTranslation(label, key);
      return value;
    }
  }

  logMissingTranslation(label, key);
  return key;
}

export function getCatalog(locale: BuzzardLocale): TranslationTree {
  return catalogs[locale];
}

export { catalogs, FALLBACK_CHAIN as FALLBACK_LOCALE };
