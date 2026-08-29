/**
 * Category mapping — links Product Core to 53-category taxonomy (JSON).
 * Does NOT embed category tree in product model.
 */
const fs = require("fs");
const path = require("path");
const { db } = require("../db");

const taxonomyFile = path.join(__dirname, "..", "..", "..", "data", "buzzard_categories.json");

function loadTaxonomy() {
  try {
    return JSON.parse(fs.readFileSync(taxonomyFile, "utf8"));
  } catch {
    return { categories: [] };
  }
}

function findTaxonomyCategory(categoryId) {
  const doc = loadTaxonomy();
  const cats = doc.categories || doc.main_categories || [];
  function walk(nodes) {
    for (const n of nodes) {
      if (n.id === categoryId || n.slug === categoryId) return n;
      if (n.children) {
        const found = walk(n.children);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(cats);
}

function setMapping({ taxonomyCategoryId, mainCategoryId, subcategoryId, subSubcategoryId, pimCategoryId }) {
  db.prepare(`
    INSERT INTO pim_core_category_mappings(
      taxonomy_category_id, pim_category_id, main_category_id, subcategory_id, sub_subcategory_id, updated_at
    ) VALUES (?,?,?,?,?, CURRENT_TIMESTAMP)
    ON CONFLICT(taxonomy_category_id) DO UPDATE SET
      pim_category_id = excluded.pim_category_id,
      main_category_id = excluded.main_category_id,
      subcategory_id = excluded.subcategory_id,
      sub_subcategory_id = excluded.sub_subcategory_id,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    taxonomyCategoryId,
    pimCategoryId || null,
    mainCategoryId || taxonomyCategoryId,
    subcategoryId || null,
    subSubcategoryId || null
  );
  return getMapping(taxonomyCategoryId);
}

function getMapping(taxonomyCategoryId) {
  const row = db.prepare("SELECT * FROM pim_core_category_mappings WHERE taxonomy_category_id = ?").get(taxonomyCategoryId);
  if (!row) {
    const cat = findTaxonomyCategory(taxonomyCategoryId);
    return {
      taxonomyCategoryId,
      exists: Boolean(cat),
      label: cat?.name || cat?.label || null,
      mainCategoryId: cat?.parent_id || taxonomyCategoryId,
    };
  }
  return {
    taxonomyCategoryId: row.taxonomy_category_id,
    pimCategoryId: row.pim_category_id,
    mainCategoryId: row.main_category_id,
    subcategoryId: row.subcategory_id,
    subSubcategoryId: row.sub_subcategory_id,
  };
}

function assignProductCategory(productId, taxonomyCategoryId, subcategoryId) {
  db.prepare(`
    UPDATE pim_core_products SET taxonomy_category_id = ?, subcategory_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(taxonomyCategoryId, subcategoryId || null, productId);
  return getMapping(taxonomyCategoryId);
}

module.exports = {
  loadTaxonomy,
  findTaxonomyCategory,
  setMapping,
  getMapping,
  assignProductCategory,
};
