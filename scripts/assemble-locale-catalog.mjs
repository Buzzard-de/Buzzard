#!/usr/bin/env node
/**
 * Assembles lib/i18n/locales/{lang}.ts from flat JSON translations.
 * Usage: node scripts/assemble-locale-catalog.mjs fr
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { unflatten } from "./extract-i18n-keys.mjs";

const lang = process.argv[2];
if (!lang) {
  console.error("Usage: node scripts/assemble-locale-catalog.mjs <lang>");
  process.exit(1);
}

const flatPath = `data/i18n/translations/${lang}.json`;
if (!existsSync(flatPath)) {
  console.error(`Missing ${flatPath}`);
  process.exit(1);
}

const flat = JSON.parse(readFileSync(flatPath, "utf8"));
const deFlat = JSON.parse(readFileSync("data/i18n/de-flat.json", "utf8"));
const deKeys = Object.keys(deFlat);
const missing = deKeys.filter((k) => !flat[k] || flat[k].trim() === "");
const extra = Object.keys(flat).filter((k) => !deKeys.includes(k));

if (missing.length) {
  console.warn(`${lang}: missing ${missing.length} keys`);
}

const tree = unflatten(flat);

function serialize(obj, indent = 2) {
  const pad = " ".repeat(indent);
  const pad2 = " ".repeat(indent + 2);
  if (typeof obj === "string") {
    return JSON.stringify(obj);
  }
  const entries = Object.entries(obj);
  if (!entries.length) return "{}";
  const lines = entries.map(([k, v]) => {
    const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : JSON.stringify(k);
    if (typeof v === "string") {
      return `${pad2}${key}: ${JSON.stringify(v)},`;
    }
    return `${pad2}${key}: ${serialize(v, indent + 2)},`;
  });
  return `{\n${lines.join("\n")}\n${pad}}`;
}

const content = `import type { TranslationTree } from "../types-catalog";

export const catalog: TranslationTree = ${serialize(tree, 2)};
`;

writeFileSync(`lib/i18n/locales/${lang}.ts`, content);
console.log(`Wrote lib/i18n/locales/${lang}.ts (${deKeys.length - missing.length}/${deKeys.length} keys, ${extra.length} extra)`);
