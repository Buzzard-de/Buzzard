#!/usr/bin/env node
/**
 * Validates translation key parity across all locale catalogs.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const deFlat = JSON.parse(readFileSync("data/i18n/de-flat.json", "utf8"));
const deKeys = Object.keys(deFlat);

function flattenTree(obj, prefix = "") {
  const entries = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") entries[p] = v;
    else Object.assign(entries, flattenTree(v, p));
  }
  return entries;
}

const langs = readdirSync("lib/i18n/locales")
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(".ts", ""));

const report = [];

for (const lang of langs.sort()) {
  const mod = await import(`../lib/i18n/locales/${lang}.ts`);
  const flat = flattenTree(mod.catalog);
  const keys = Object.keys(flat);
  const missing = deKeys.filter((k) => !(k in flat));
  const empty = keys.filter((k) => !flat[k]?.trim());
  const englishSuspect = keys.filter((k) => {
    if (lang === "en") return false;
    const val = flat[k];
    const enVal = deFlat[k]; // rough: flag if identical to de (unlikely) or common English words only for non-latin
    return /^[A-Za-z][A-Za-z\s'.,:;!?&–—\-{}0-9€$]+$/.test(val) && !["SKU", "API", "ACEA", "OEM", "EAN", "DHL", "DPD", "PayPal", "Stripe", "Klarna", "SEPA", "Buzzard24", "Buzzard", "FAQ"].some((t) => val.includes(t)) && val.length > 12;
  }).slice(0, 5);

  report.push({
    language: lang,
    file: `lib/i18n/locales/${lang}.ts`,
    keys: keys.length,
    missingKeys: missing.length,
    emptyKeys: empty.length,
    status: missing.length === 0 && empty.length === 0 ? "PASS" : "FAIL",
    missing: missing.slice(0, 10),
    englishSuspectSample: englishSuspect,
  });
}

writeFileSync("data/i18n/parity-report.json", JSON.stringify(report, null, 2));

const failed = report.filter((r) => r.status === "FAIL");
console.log(`Parity check: ${report.length} catalogs, ${failed.length} failed`);
for (const row of report) {
  console.log(`${row.language.padEnd(4)} ${row.keys} keys missing=${row.missingKeys} empty=${row.emptyKeys} ${row.status}`);
}
if (failed.length) process.exit(1);
