#!/usr/bin/env node
/**
 * Sync existing catalog products into srch_products for advanced search.
 * Does not add new products — only upserts entries from data/buzzard_products.json.
 *
 * Usage:
 *   node scripts/sync-search-index.mjs
 *   BUZZARD_DB_PATH=/var/data/buzzard.db node scripts/sync-search-index.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("../server/node_modules/better-sqlite3");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.BUZZARD_DB_PATH
  ? path.resolve(process.env.BUZZARD_DB_PATH)
  : path.join(root, "server", "data", "buzzard.db");
const catalogFile = path.join(root, "data", "buzzard_products.json");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}
if (!fs.existsSync(catalogFile)) {
  console.error(`Catalog not found: ${catalogFile}`);
  process.exit(1);
}

const db = new Database(dbPath);
const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));

const upsert = db.prepare(`
  INSERT INTO srch_products(
    sku, title, description, category, subcategory, brand, price, currency,
    rating, review_count, stock, tags, attributes_json, active, updated_at
  )
  VALUES(@sku, @title, @description, @category, @subcategory, @brand, @price, @currency,
         @rating, @review_count, @stock, @tags, @attributes_json, @active, CURRENT_TIMESTAMP)
  ON CONFLICT(sku) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    subcategory = excluded.subcategory,
    brand = excluded.brand,
    price = excluded.price,
    currency = excluded.currency,
    rating = excluded.rating,
    review_count = excluded.review_count,
    stock = excluded.stock,
    tags = excluded.tags,
    attributes_json = excluded.attributes_json,
    active = excluded.active,
    updated_at = CURRENT_TIMESTAMP
`);

let synced = 0;
for (const product of catalog.products || []) {
  if (product.status !== "active") continue;
  const slug = product.seo?.slug || "";
  upsert.run({
    sku: product.sku,
    title: product.name,
    description: product.short_description || product.description || "",
    category: product.category_id || "",
    subcategory: (product.category_ids || [])[1] || "",
    brand: product.brand || "",
    price: Number(product.price?.amount || 0),
    currency: product.price?.currency || "EUR",
    rating: 0,
    review_count: 0,
    stock: Number(product.stock || 0),
    tags: [slug, product.brand, product.sku].filter(Boolean).join(","),
    attributes_json: JSON.stringify({
      slug,
      image_key: product.attributes?.image_key || null,
    }),
    active: 1,
  });
  synced += 1;
}

const total = db.prepare("SELECT COUNT(*) n FROM srch_products WHERE active = 1").get().n;
console.log(`Synced ${synced} catalog products into srch_products (${total} active rows total).`);
db.close();
