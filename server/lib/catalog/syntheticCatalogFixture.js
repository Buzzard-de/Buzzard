const { canonicalizeCatalogPath, refusal } = require("./catalogPath");

const SCHEMA = `
CREATE TABLE catalog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);
CREATE TABLE catalog_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);
CREATE TABLE catalog_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  visibility TEXT NOT NULL,
  category_id TEXT,
  brand_id TEXT
);
CREATE TABLE catalog_identifiers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE catalog_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  axis TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE catalog_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
`;

const SYNTHETIC_CATALOG = {
  categories: [
    { id: "fiction-cat-props", name: "Sample Household Props", slug: "sample-household-props" },
  ],
  brands: [
    { id: "fiction-brand-atelier", name: "Northwind Sample Atelier", slug: "northwind-sample-atelier" },
  ],
  products: [
    {
      id: "fiction-lamp-1",
      sku: "FICTION-LAMP-001",
      title: "Paper Lantern Sample",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
      category_id: "fiction-cat-props",
      brand_id: "fiction-brand-atelier",
    },
    {
      id: "fiction-mug-1",
      sku: "FICTION-MUG-001",
      title: "Ceramic Sample Mug",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
      category_id: "fiction-cat-props",
      brand_id: "fiction-brand-atelier",
    },
  ],
  identifiers: [
    { id: "fiction-id-lamp-sku", product_id: "fiction-lamp-1", kind: "sku", value: "FICTION-LAMP-001" },
    { id: "fiction-id-lamp-token", product_id: "fiction-lamp-1", kind: "fixture_token", value: "FICTION-TOKEN-LAMP" },
    { id: "fiction-id-mug-sku", product_id: "fiction-mug-1", kind: "sku", value: "FICTION-MUG-001" },
  ],
  variants: [
    { id: "fiction-var-lamp-blue", product_id: "fiction-lamp-1", sku: "FICTION-LAMP-001-BLUE", axis: "color", value: "sample-blue" },
    { id: "fiction-var-mug-small", product_id: "fiction-mug-1", sku: "FICTION-MUG-001-SMALL", axis: "size", value: "sample-small" },
  ],
  media: [
    { id: "fiction-media-lamp", product_id: "fiction-lamp-1", media_type: "illustration", label: "fixture-illustration-lantern", sort_order: 0 },
    { id: "fiction-media-mug", product_id: "fiction-mug-1", media_type: "illustration", label: "fixture-illustration-mug", sort_order: 0 },
  ],
};

function createSyntheticCatalog(dbPath) {
  const canonical = canonicalizeCatalogPath(dbPath, { allowMissing: true });
  const fs = require("fs");
  if (fs.existsSync(canonical)) throw refusal("CATALOG_FIXTURE_EXISTS");
  const Database = require("better-sqlite3");
  const db = new Database(canonical);
  try {
    db.exec(SCHEMA);
    const insertCategory = db.prepare("INSERT INTO catalog_categories (id, name, slug) VALUES (?, ?, ?)");
    const insertBrand = db.prepare("INSERT INTO catalog_brands (id, name, slug) VALUES (?, ?, ?)");
    const insertProduct = db.prepare(`
      INSERT INTO catalog_products (id, sku, title, status, visibility, category_id, brand_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertIdentifier = db.prepare("INSERT INTO catalog_identifiers (id, product_id, kind, value) VALUES (?, ?, ?, ?)");
    const insertVariant = db.prepare("INSERT INTO catalog_variants (id, product_id, sku, axis, value) VALUES (?, ?, ?, ?, ?)");
    const insertMedia = db.prepare("INSERT INTO catalog_media (id, product_id, media_type, label, sort_order) VALUES (?, ?, ?, ?, ?)");
    for (const row of SYNTHETIC_CATALOG.categories) insertCategory.run(row.id, row.name, row.slug);
    for (const row of SYNTHETIC_CATALOG.brands) insertBrand.run(row.id, row.name, row.slug);
    for (const row of SYNTHETIC_CATALOG.products) {
      insertProduct.run(row.id, row.sku, row.title, row.status, row.visibility, row.category_id, row.brand_id);
    }
    for (const row of SYNTHETIC_CATALOG.identifiers) insertIdentifier.run(row.id, row.product_id, row.kind, row.value);
    for (const row of SYNTHETIC_CATALOG.variants) insertVariant.run(row.id, row.product_id, row.sku, row.axis, row.value);
    for (const row of SYNTHETIC_CATALOG.media) insertMedia.run(row.id, row.product_id, row.media_type, row.label, row.sort_order);
  } catch (err) {
    try { db.close(); } catch { /* the fixture file is discarded by the caller */ }
    throw err;
  }
  db.close();
  return { path: canonical, rows: SYNTHETIC_CATALOG };
}

module.exports = {
  SCHEMA,
  SYNTHETIC_CATALOG,
  createSyntheticCatalog,
};
