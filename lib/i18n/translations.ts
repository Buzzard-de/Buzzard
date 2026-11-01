import type { BuzzardLocale } from "./types";
import type { TranslationTree } from "./types-catalog";
import { LANGUAGE_CODES } from "./languages";
import { catalog as de } from "./locales/de";
import { catalog as en } from "./locales/en";
import { catalog as tr } from "./locales/tr";
import { catalog as ar } from "./locales/ar";
import { catalog as fr } from "./locales/fr";
import { catalog as nl } from "./locales/nl";
import { catalog as bg } from "./locales/bg";
import { catalog as hr } from "./locales/hr";
import { catalog as el } from "./locales/el";
import { catalog as cs } from "./locales/cs";
import { catalog as da } from "./locales/da";
import { catalog as et } from "./locales/et";
import { catalog as fi } from "./locales/fi";
import { catalog as hu } from "./locales/hu";
import { catalog as it } from "./locales/it";
import { catalog as lv } from "./locales/lv";
import { catalog as lt } from "./locales/lt";
import { catalog as lb } from "./locales/lb";
import { catalog as mt } from "./locales/mt";
import { catalog as pl } from "./locales/pl";
import { catalog as pt } from "./locales/pt";
import { catalog as ro } from "./locales/ro";
import { catalog as sk } from "./locales/sk";
import { catalog as sl } from "./locales/sl";
import { catalog as es } from "./locales/es";
import { catalog as ca } from "./locales/ca";
import { catalog as eu } from "./locales/eu";
import { catalog as gl } from "./locales/gl";
import { catalog as sv } from "./locales/sv";
import { catalog as ga } from "./locales/ga";

export type { TranslationTree };

const catalogs: Record<string, TranslationTree> = {
  de,
  en,
  tr,
  ar,
  fr,
  nl,
  bg,
  hr,
  el,
  cs,
  da,
  et,
  fi,
  hu,
  it,
  lv,
  lt,
  lb,
  mt,
  pl,
  pt,
  ro,
  sk,
  sl,
  es,
  ca,
  eu,
  gl,
  sv,
  ga,
};
const FALLBACK_LOCALE: BuzzardLocale = "de";
const missingKeys = new Set<string>();

function resolve(tree: TranslationTree | undefined, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(locale: string, key: string): string {
  const value = resolve(catalogs[locale], key) ?? resolve(catalogs[FALLBACK_LOCALE], key);
  if (value) return value;

  if (process.env.NODE_ENV === "development" && !missingKeys.has(key)) {
    missingKeys.add(key);
    console.warn(`[i18n] missing translation key: ${key} (${locale})`);
  }
  return key;
}

export function getCatalog(locale: string): TranslationTree {
  return catalogs[locale] || catalogs[FALLBACK_LOCALE];
}

export function loadedLanguageCount(): number {
  return LANGUAGE_CODES.filter((code) => Boolean(catalogs[code])).length;
}

export { catalogs, FALLBACK_LOCALE };
