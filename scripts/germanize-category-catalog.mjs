#!/usr/bin/env node
/**
 * Migrate category catalog from Turkish URLs (/kategori/…) to German (/kategorie/…).
 * Regenerates buzzard_categories.json and category redirect rules.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  germanCategoryName,
  germanCategorySlug,
} from "./category-german-dict.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "data/buzzard_categories.json");
const legacyRedirectsPath = path.join(root, "data/category_legacy_redirects.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const redirects = [];

function ensureUniqueSlug(baseSlug, used) {
  let slug = baseSlug || "kategorie";
  let counter = 2;
  while (used.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  used.add(slug);
  return slug;
}

function migrateNodes(nodes, parentSlugPath = [], parentLegacyPath = []) {
  const usedSlugs = new Set();

  for (const node of nodes) {
    const legacySlugPath = [...parentLegacyPath, node.slug].join("/");
    const oldUrl = node.url.startsWith("/") ? node.url : `/${node.url}`;
    const germanName = germanCategoryName(node);
    const baseSlug = germanCategorySlug(node, germanName);
    const slug = ensureUniqueSlug(baseSlug, usedSlugs);
    const slugPath = [...parentSlugPath, slug];
    const newUrl = `/kategorie/${slugPath.join("/")}`;

    node.legacy_name = node.name;
    node.legacy_slug = node.slug;
    node.legacy_slug_path = legacySlugPath;
    node.legacy_url = oldUrl;
    node.name = germanName;
    node.slug = slug;
    node.url = newUrl;

    if (oldUrl !== newUrl) {
      redirects.push({
        from: `${oldUrl}/`,
        to: `${newUrl}/`,
        permanent: true,
        note: `Legacy TR category ${legacySlugPath}`,
      });
    }

    if (node.children?.length) {
      migrateNodes(node.children, slugPath, legacySlugPath.split("/"));
    }
  }
}

catalog.language = "de";
catalog.rules = {
  ...catalog.rules,
  example: "Textil → Herrenbekleidung → Hose / Pullover & Strick / Hemd / T-Shirt",
  category_path: "/kategorie/",
};

migrateNodes(catalog.categories);

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
fs.writeFileSync(legacyRedirectsPath, `${JSON.stringify(redirects, null, 2)}\n`, "utf8");

console.log(`Germanized ${redirects.length} category URLs`);
console.log(`Wrote ${catalogPath}`);
console.log(`Wrote ${redirects.length} legacy redirects to category_legacy_redirects.json`);
