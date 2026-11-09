import { catalogs, FALLBACK_LOCALE } from "./translations";
import { LANGUAGE_CODES } from "./languages";

export type LocaleAuditRow = {
  locale: string;
  missingKeys: string[];
  extraKeys: string[];
  placeholderMismatches: string[];
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
    return {
      locale,
      missingKeys,
      extraKeys,
      placeholderMismatches,
      rtl: locale === "ar",
      complete: false,
      verified: false,
    };
  });
  return {
    listed: LANGUAGE_CODES.length,
    fallback: FALLBACK_LOCALE,
    rows,
    complete: false,
    machineTranslationAccepted: false,
  };
}
