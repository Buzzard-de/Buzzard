#!/usr/bin/env node
/**
 * Regenerates intelligence/buzzard_intelligence/seed_categories_de.json
 * from data/buzzard_categories.json (top-level category names only).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "data/buzzard_categories.json");
const dest = join(root, "intelligence/buzzard_intelligence/seed_categories_de.json");

const data = JSON.parse(readFileSync(src, "utf8"));
const names = (data.categories ?? data).map((c) => c.name).filter(Boolean);

writeFileSync(dest, JSON.stringify(names, null, 2) + "\n", "utf8");
console.log(`Wrote ${names.length} categories to ${dest}`);
