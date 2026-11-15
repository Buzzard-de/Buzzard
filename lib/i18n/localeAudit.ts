import { authoredCatalogs, catalogs, FALLBACK_LOCALE } from "./translations";
import { machineCatalogs } from "./locales/machineFill";
import { LANGUAGE_CODES } from "./languages";

export type LocaleAuditRow = {
  locale: string;
  missingKeys: string[];
  extraKeys: string[];
  placeholderMismatches: string[];
  mixedLanguageKeys: string[];
  emptyKeys: string[];
  nativeKeys: string[];
  machineGeneratedKeys: string[];
  fallbackKeys: string[];
  humanReviewedKeys: string[];
  keyComplete: boolean;
  humanReviewed: false;
  rtl: boolean;
  complete: false;
  verified: false;
};

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") Object.assign(out, flatten(v, key));
      else out[key] = String(v);
    }
  }
  return out;
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map((m) => m[0]).sort();
}

export function auditLocales(): {
  listed: number;
  fallback: string;
  rows: LocaleAuditRow[];
  keyCompleteAll: boolean;
  complete: false;
  machineTranslationAccepted: false;
  nativeStrings: number;
  machineGeneratedStrings: number;
  fallbackStrings: number;
  missingStrings: number;
  mixedLanguageStrings: number;
  humanReviewedStrings: number;
} {
  const de = flatten(authoredCatalogs.de);
  const en = flatten(authoredCatalogs.en);
  const deKeys = Object.keys(de).sort();
  const rows: LocaleAuditRow[] = LANGUAGE_CODES.map((locale) => {
    const authored = flatten(authoredCatalogs[locale] || {});
    const machine = flatten(machineCatalogs[locale] || {});
    const cat = flatten(catalogs[locale] || {});
    const keys = Object.keys(cat);
    const missingKeys = deKeys.filter((k) => !(k in cat) || String(cat[k]).trim() === "");
    const extraKeys = keys.filter((k) => !(k in de));
    const placeholderMismatches = deKeys.filter((k) => {
      if (!(k in cat)) return false;
      return placeholders(de[k]).join() !== placeholders(cat[k]).join();
    });
    const emptyKeys = deKeys.filter((k) => k in cat && String(cat[k]).trim() === "");
    const nativeKeys = deKeys.filter((k) => k in authored && String(authored[k]).trim() !== "");
    const machineGeneratedKeys = deKeys.filter((k) => !(k in authored) && k in machine && String(machine[k]).trim() !== "");
    const fallbackKeys = deKeys.filter((k) => !(k in cat) || String(cat[k]).trim() === "");
    const mixedLanguageKeys = deKeys.filter((k) => {
      const value = cat[k];
      if (!value) return false;
      if (locale !== "de" && value === de[k] && value.length >= 16 && !/Buzzard|Trusted Shops|€/.test(value) && /[äöüÄÖÜß]/.test(value)) {
        return true;
      }
      if (locale !== "en" && locale !== "de" && value === en[k] && value.length >= 16 && /[A-Za-z]/.test(value) && !/Buzzard|Trusted Shops|€|\{/.test(value)) {
        return true;
      }
      return false;
    });
    const keyComplete = missingKeys.length === 0 && emptyKeys.length === 0 && placeholderMismatches.length === 0;
    return {
      locale,
      missingKeys,
      extraKeys,
      placeholderMismatches,
      mixedLanguageKeys,
      emptyKeys,
      nativeKeys,
      machineGeneratedKeys,
      fallbackKeys,
      humanReviewedKeys: [],
      keyComplete,
      humanReviewed: false,
      rtl: locale === "ar",
      complete: false,
      verified: false,
    };
  });
  const sum = (pick: (row: LocaleAuditRow) => string[]) => rows.reduce((total, row) => total + pick(row).length, 0);
  return {
    listed: LANGUAGE_CODES.length,
    fallback: FALLBACK_LOCALE,
    rows,
    keyCompleteAll: rows.every((r) => r.keyComplete),
    complete: false,
    machineTranslationAccepted: false,
    nativeStrings: sum((row) => row.nativeKeys),
    machineGeneratedStrings: sum((row) => row.machineGeneratedKeys),
    fallbackStrings: sum((row) => row.fallbackKeys),
    missingStrings: sum((row) => row.missingKeys),
    mixedLanguageStrings: sum((row) => row.mixedLanguageKeys),
    humanReviewedStrings: 0,
  };
}
