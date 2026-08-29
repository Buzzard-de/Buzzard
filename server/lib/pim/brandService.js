const crypto = require("crypto");
const { db } = require("../db");

function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "brand";
}

function listBrands() {
  return db.prepare("SELECT * FROM pim_core_brands ORDER BY name").all().map(mapBrand);
}

function mapBrand(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    manufacturer: row.manufacturer,
    country: row.country,
    logo: row.logo_url,
    website: row.website,
    status: row.status,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
  };
}

function getBrand(idOrSlug) {
  let row = db.prepare("SELECT * FROM pim_core_brands WHERE id = ?").get(idOrSlug);
  if (!row) row = db.prepare("SELECT * FROM pim_core_brands WHERE slug = ?").get(idOrSlug);
  return row ? mapBrand(row) : null;
}

function createBrand(input) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Brand name required");
  const existing = db.prepare("SELECT id FROM pim_core_brands WHERE LOWER(name) = LOWER(?)").get(name);
  if (existing) throw new Error(`Brand already exists: ${name}`);

  let slug = input.slug || slugifyName(name);
  const slugDup = db.prepare("SELECT id FROM pim_core_brands WHERE slug = ?").get(slug);
  if (slugDup) slug = `${slug}-${Date.now().toString(36)}`;

  const result = db.prepare(`
    INSERT INTO pim_core_brands(name, slug, manufacturer, country, logo_url, website, status, metadata_json)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    name,
    slug,
    input.manufacturer || null,
    input.country || null,
    input.logo || input.logoUrl || null,
    input.website || null,
    input.status || "ACTIVE",
    JSON.stringify(input.metadata || {})
  );
  return getBrand(result.lastInsertRowid);
}

module.exports = { listBrands, getBrand, createBrand, slugifyName };
