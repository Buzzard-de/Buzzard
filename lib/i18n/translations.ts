import type { BuzzardLocale } from "./types";
import { resolveLanguageFromLocaleTag } from "./types";
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
import { machineCatalogs } from "./locales/machineFill";
import gapFills from "@/data/i18n/ui-gap-fills.json";

export type { TranslationTree };

function deepFill(target: TranslationTree, source: TranslationTree): TranslationTree {
  const out: TranslationTree = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepFill((typeof out[key] === "object" && out[key] ? (out[key] as TranslationTree) : {}), value as TranslationTree);
    } else if (out[key] == null || out[key] === "") {
      out[key] = value;
    }
  }
  return out;
}

const rawCatalogs: Record<string, TranslationTree> = {
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

/** Authored catalogues only. Missing keys are not copied from English. */
export const authoredCatalogs: Record<string, TranslationTree> = rawCatalogs;

function gapTree(flat: Record<string, string> | undefined): TranslationTree {
  const root: TranslationTree = {};
  if (!flat) return root;
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node: TranslationTree = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      const next = node[part];
      if (!next || typeof next === "string") node[part] = {};
      node = node[part] as TranslationTree;
    }
    const leaf = parts[parts.length - 1];
    if (node[leaf] == null || node[leaf] === "") node[leaf] = value;
  }
  return root;
}

const gapFillTrees = gapFills as Record<string, Record<string, string>>;

/** Authored strings win. Machine catalogs fill holes, then the storefront gap file. */
const catalogs: Record<string, TranslationTree> = Object.fromEntries(
  LANGUAGE_CODES.map((code) => {
    if (code === "de") return [code, rawCatalogs.de];
    const withMachine = deepFill(rawCatalogs[code] || {}, machineCatalogs[code] || {});
    return [code, deepFill(withMachine, gapTree(gapFillTrees[code]))];
  })
);
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

/** Selected catalog, then German. English is not a silent substitute. */
export function fallbackChain(language: string): BuzzardLocale[] {
  if (language === FALLBACK_LOCALE) return [FALLBACK_LOCALE];
  return [language as BuzzardLocale, FALLBACK_LOCALE];
}

/** Selected locale only. A missing key stays missing instead of showing another language. */
export function storefrontString(locale: string, key: string) {
  const own = resolve(catalogs[locale], key);
  if (!own) {
    return { text: "MISSING_TRANSLATION", status: "MISSING_TRANSLATION" as const, provenance: "ABSENT", review: "UNREVIEWED", humanReviewed: false };
  }
  const authored = resolve(authoredCatalogs[locale], key);
  if (locale === "de" && authored) {
    return { text: own, status: "PRESENT" as const, provenance: "SOURCE_DE", review: "UNREVIEWED", humanReviewed: false };
  }
  if (authored) {
    return { text: own, status: "PRESENT" as const, provenance: "AUTHORED", review: "UNREVIEWED", humanReviewed: false };
  }
  return { text: own, status: "PRESENT" as const, provenance: "MACHINE_DRAFT", review: "UNREVIEWED", humanReviewed: false };
}

export function flattenCatalog(tree: TranslationTree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") Object.assign(out, flattenCatalog(value as TranslationTree, path));
  }
  return out;
}

export function listMissingKeys(language: string, baseline: BuzzardLocale = FALLBACK_LOCALE): string[] {
  const base = flattenCatalog(getCatalog(baseline));
  const current = flattenCatalog(getCatalog(language));
  return Object.keys(base).filter((key) => !(key in current));
}

export async function loadCatalog(language: string): Promise<TranslationTree> {
  return getCatalog(language);
}

export async function loadLocale(localeTag: string): Promise<TranslationTree> {
  return getCatalog(resolveLanguageFromLocaleTag(localeTag));
}

const TECHNICAL_FALLBACK: BuzzardLocale[] = [FALLBACK_LOCALE];

export { catalogs, FALLBACK_LOCALE, TECHNICAL_FALLBACK };
