import type { BuzzardLanguageCode } from "./types";
import type { TranslationTree } from "./types-catalog";
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

const catalogs: Record<BuzzardLanguageCode, TranslationTree> = {
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

const TECHNICAL_FALLBACK: BuzzardLanguageCode[] = ["en", "de"];
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

export function translate(language: BuzzardLanguageCode, key: string, localeLabel?: string): string {
  const label = localeLabel ?? language;
  const primary = resolve(catalogs[language], key);
  if (primary) return primary;

  for (const fallback of TECHNICAL_FALLBACK) {
    if (fallback === language) continue;
    const value = resolve(catalogs[fallback], key);
    if (value) {
      logMissingTranslation(label, key);
      return value;
    }
  }

  logMissingTranslation(label, key);
  return key;
}

export function getCatalog(language: BuzzardLanguageCode): TranslationTree {
  return catalogs[language];
}

export async function loadCatalog(language: BuzzardLanguageCode): Promise<TranslationTree> {
  return catalogs[language];
}

export async function loadLocale(localeTag: string): Promise<TranslationTree> {
  const { resolveLanguageFromLocaleTag } = await import("./types");
  return getCatalog(resolveLanguageFromLocaleTag(localeTag));
}

export { catalogs, TECHNICAL_FALLBACK as FALLBACK_LOCALE };
