import { catalogs, FALLBACK_LOCALE } from "./translations";
import { LANGUAGE_CODES } from "./languages";

export type LocaleAuditRow = {
  locale: string;
  missingKeys: string[];
  extraKeys: string[];
  placeholderMismatches: string[];
  mixedLanguageKeys: string[];
  emptyKeys: string[];
  keyComplete: boolean;
  machineGeneratedKeys: string[];
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
} {
  const de = flatten(catalogs.de);
  const deKeys = Object.keys(de).sort();
  const rows: LocaleAuditRow[] = LANGUAGE_CODES.map((locale) => {
    const cat = flatten(catalogs[locale] || catalogs[FALLBACK_LOCALE]);
    const keys = Object.keys(cat);
    const missingKeys = deKeys.filter((k) => !(k in cat));
    const extraKeys = keys.filter((k) => !(k in de));
    const placeholderMismatches = deKeys.filter((k) => {
      if (!(k in cat)) return false;
      return placeholders(de[k]).join() !== placeholders(cat[k]).join();
    });
    const emptyKeys = deKeys.filter((k) => k in cat && String(cat[k]).trim() === "");
    const mixedLanguageKeys =
      locale === "de"
        ? []
        : deKeys.filter((k) => {
            const a = de[k];
            const b = cat[k];
            if (!b || a !== b) return false;
            if (a.length < 16) return false;
            if (/Buzzard|Trusted Shops|€/.test(a)) return false;
            return /[äöüÄÖÜß]/.test(a);
          });
    const keyComplete = missingKeys.length === 0 && emptyKeys.length === 0 && placeholderMismatches.length === 0;
    return {
      locale,
      missingKeys,
      extraKeys,
      placeholderMismatches,
      mixedLanguageKeys,
      emptyKeys,
      keyComplete,
      machineGeneratedKeys: [],
      humanReviewed: false,
      rtl: locale === "ar",
      complete: false,
      verified: false,
    };
  });
  return {
    listed: LANGUAGE_CODES.length,
    fallback: FALLBACK_LOCALE,
    rows,
    keyCompleteAll: rows.every((r) => r.keyComplete),
    complete: false,
    machineTranslationAccepted: false,
  };
}
