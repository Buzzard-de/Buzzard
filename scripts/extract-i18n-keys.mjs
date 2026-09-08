#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { catalog as de } from "../lib/i18n/locales/de.ts";

function flatten(obj, prefix = "") {
  const entries = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") entries[p] = v;
    else Object.assign(entries, flatten(v, p));
  }
  return entries;
}

function unflatten(flat) {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

const flat = flatten(de);
writeFileSync("data/i18n/de-flat.json", JSON.stringify(flat, null, 2));
writeFileSync("data/i18n/key-list.json", JSON.stringify(Object.keys(flat), null, 2));
console.log(`Extracted ${Object.keys(flat).length} keys`);

export { flatten, unflatten };
