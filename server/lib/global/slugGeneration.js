/**
 * Localized slug generation — stable, normalized, duplicate-safe.
 */
const { stripDiacritics } = require("./searchNormalization");

function generateLocalizedSlug(input, options = {}) {
  const language = options.language || "de";
  let slug = stripDiacritics(String(input || ""))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (language === "ar") {
    slug = String(input || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FF0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return slug.slice(0, 120);
}

function ensureUniqueSlug(baseSlug, existingSlugs = new Set()) {
  let slug = baseSlug;
  let counter = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
}

module.exports = {
  generateLocalizedSlug,
  ensureUniqueSlug,
};
