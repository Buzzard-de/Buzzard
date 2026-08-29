const { db } = require("../db");

function slugify(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function assertUniqueSlug(slug, excludeProductId) {
  const row = db.prepare(`
    SELECT id FROM pim_core_products WHERE json_extract(seo_json, '$.slug') = ? AND id != ?
  `).get(slug, excludeProductId || "");
  if (row) throw new Error(`Duplicate SEO slug: ${slug}`);
}

function buildSeo(product) {
  const slug = product.seo?.slug || slugify(product.title);
  assertUniqueSlug(slug, product.id);
  return {
    slug,
    metaTitle: product.seo?.metaTitle || product.title?.slice(0, 120),
    metaDescription: product.seo?.metaDescription || product.shortDescription?.slice(0, 320),
    canonical: product.seo?.canonical || null,
    structured: product.seo?.structured || {},
  };
}

function updateSeo(productId, seoPatch) {
  const row = db.prepare("SELECT * FROM pim_core_products WHERE id = ?").get(productId);
  if (!row) throw new Error("Product not found");
  const current = row.seo_json ? JSON.parse(row.seo_json) : {};
  const next = { ...current, ...seoPatch };
  if (next.slug) assertUniqueSlug(next.slug, productId);
  db.prepare("UPDATE pim_core_products SET seo_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    JSON.stringify(next),
    productId
  );
  return next;
}

module.exports = { buildSeo, updateSeo, slugify, assertUniqueSlug };
