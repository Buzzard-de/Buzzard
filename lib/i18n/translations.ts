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

import gapFills from "@/data/i18n/ui-gap-fills.json";

/** Display fallback is English. German is never a silent UI fallback. */
export const FALLBACK_LOCALE: BuzzardLanguageCode = "en";
const TECHNICAL_FALLBACK: BuzzardLanguageCode[] = ["en"];
const missingKeys = new Set<string>();
const mergedCatalogs = new Map<BuzzardLanguageCode, TranslationTree>();

function resolve(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function setPath(tree: TranslationTree, key: string, value: string): void {
  const parts = key.split(".");
  let node: TranslationTree = tree;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = node[part];
    if (!next || typeof next === "string") {
      node[part] = {};
    }
    node = node[part] as TranslationTree;
  }
  node[parts[parts.length - 1]] = value;
}

function cloneTree(tree: TranslationTree): TranslationTree {
  return JSON.parse(JSON.stringify(tree)) as TranslationTree;
}

export function getCatalog(language: BuzzardLanguageCode): TranslationTree {
  const cached = mergedCatalogs.get(language);
  if (cached) return cached;
  const merged = cloneTree(catalogs[language] ?? catalogs.en);
  const fills = (gapFills as Record<string, Record<string, string>>)[language];
  if (fills) {
    for (const [key, value] of Object.entries(fills)) {
      if (!resolve(merged, key)) setPath(merged, key, value);
    }
  }
  mergedCatalogs.set(language, merged);
  return merged;
}

function logMissingTranslation(localeLabel: string, key: string): void {
  if (process.env.NODE_ENV === "production" || missingKeys.has(`${localeLabel}:${key}`)) return;
  missingKeys.add(`${localeLabel}:${key}`);
  console.warn(`[BUZZARD i18n] Missing translation:\n${localeLabel}.${key}`);
}

export function fallbackChain(language: BuzzardLanguageCode): BuzzardLanguageCode[] {
  if (language === "en") return ["en"];
  return [language, "en"];
}

export function flattenCatalog(tree: TranslationTree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") Object.assign(out, flattenCatalog(value, path));
  }
  return out;
}

export function listMissingKeys(language: BuzzardLanguageCode, baseline: BuzzardLanguageCode = "de"): string[] {
  const base = flattenCatalog(getCatalog(baseline));
  const current = flattenCatalog(getCatalog(language));
  return Object.keys(base).filter((key) => !(key in current));
}

export function translate(language: BuzzardLanguageCode, key: string, localeLabel?: string): string {
  const label = localeLabel ?? language;
  for (const candidate of fallbackChain(language)) {
    const value = resolve(getCatalog(candidate), key);
    if (value) {
      if (candidate !== language) logMissingTranslation(label, key);
      return value;
    }
  }
  logMissingTranslation(label, key);
  return key;
}

export async function loadCatalog(language: BuzzardLanguageCode): Promise<TranslationTree> {
  return getCatalog(language);
}

export async function loadLocale(localeTag: string): Promise<TranslationTree> {
  const { resolveLanguageFromLocaleTag } = await import("./types");
  return getCatalog(resolveLanguageFromLocaleTag(localeTag));
}

export { catalogs, TECHNICAL_FALLBACK };
