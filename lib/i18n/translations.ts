import type { BuzzardLocale } from "./types";
import type { TranslationTree } from "./types-catalog";
import { catalog as de } from "./locales/de";
import { catalog as en } from "./locales/en";
import { catalog as tr } from "./locales/tr";
import { catalog as ar } from "./locales/ar";

export type { TranslationTree };

const catalogs: Record<BuzzardLocale, TranslationTree> = { de, en, tr, ar };
const FALLBACK_LOCALE: BuzzardLocale = "de";
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

export function translate(locale: BuzzardLocale, key: string): string {
  const value = resolve(catalogs[locale], key) ?? resolve(catalogs[FALLBACK_LOCALE], key);
  if (value) return value;

  if (process.env.NODE_ENV === "development" && !missingKeys.has(key)) {
    missingKeys.add(key);
    console.warn(`[i18n] missing translation key: ${key} (${locale})`);
  }
  return key;
}

export function getCatalog(locale: BuzzardLocale): TranslationTree {
  return catalogs[locale];
}

export { catalogs, FALLBACK_LOCALE };
