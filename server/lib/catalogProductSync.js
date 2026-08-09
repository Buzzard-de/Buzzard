const fs = require("fs");
const path = require("path");
const { db } = require("./db");

const CATEGORY_BY_PREFIX = {
  "cat-05": "Automotive",
  "cat-06": "Garden",
  "cat-07": "Home",
  "cat-08": "Pet",
  "cat-09": "Sports",
  "cat-10": "Cleaning",
  "cat-11": "Textile",
  "cat-12": "Electronics",
};

function resolveCategoryName(categoryId) {
  if (!categoryId || typeof categoryId !== "string") return "Automotive";
  const prefix = categoryId.slice(0, 6);
  return CATEGORY_BY_PREFIX[prefix] || "Automotive";
}

function ensureCategory(name) {
  db.prepare("INSERT OR IGNORE INTO categories(name) VALUES (?)").run(name);
  return db.prepare("SELECT id FROM categories WHERE name = ?").get(name).id;
}

function catalogJsonPath() {
  return path.join(__dirname, "../../data/buzzard_products.json");
}

function loadCatalogProducts() {
  const filePath = catalogJsonPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(raw.products) ? raw.products : [];
  } catch {
    return [];
  }
}

function collectCatalogRows(product) {
  if (!product || product.status !== "active") return [];
  const categoryName = resolveCategoryName(product.category_id);
  const weight = Number(product.shipping?.weight_kg) || 0.5;
  const basePrice = Number(product.price?.amount) || 0;
  const baseStock = Number(product.stock) || 0;
  const rows = [
    {
      sku: product.sku,
      name: product.name,
      description: product.short_description || product.description || "",
      categoryName,
      price: basePrice,
      weight,
      stock: baseStock,
    },
  ];

  for (const variant of product.variants || []) {
    if (!variant?.sku) continue;
    rows.push({
      sku: variant.sku,
      name: `${product.name} (${variant.label}: ${variant.value})`,
      description: product.short_description || "",
      categoryName,
      price: Number(variant.price?.amount) || basePrice,
      weight,
      stock: Number(variant.stock) || baseStock,
    });
  }

  return rows;
}

function syncCatalogProducts() {
  const products = loadCatalogProducts();
  if (!products.length) return { synced: 0 };

  const upsert = db.prepare(`
    INSERT INTO products (sku, name, description, category_id, price_eur, weight_kg, stock, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(sku) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category_id = excluded.category_id,
      price_eur = excluded.price_eur,
      weight_kg = excluded.weight_kg,
      stock = excluded.stock,
      active = 1
  `);

  let synced = 0;
  for (const product of products) {
    for (const row of collectCatalogRows(product)) {
      const categoryId = ensureCategory(row.categoryName);
      upsert.run(
        row.sku,
        row.name,
        row.description,
        categoryId,
        row.price,
        row.weight,
        row.stock
      );
      synced += 1;
    }
  }

  return { synced };
}

function findProductBySku(sku) {
  return db
    .prepare(`
      SELECT p.*, c.name category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.sku = ? AND p.active = 1
    `)
    .get(sku);
}

module.exports = {
  syncCatalogProducts,
  findProductBySku,
};
