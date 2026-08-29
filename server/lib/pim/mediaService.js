const crypto = require("crypto");
const { db } = require("../db");
const { MEDIA_TYPE } = require("../../core/productConstants");

function newId() {
  return `pmed_${crypto.randomBytes(6).toString("hex")}`;
}

function addMedia(productId, { mediaType, url, altText, isPrimary, sortOrder }) {
  if (!url) throw new Error("Media URL required");
  const type = mediaType || MEDIA_TYPE.IMAGE;
  if (isPrimary && type === MEDIA_TYPE.IMAGE) {
    db.prepare("UPDATE pim_core_media SET is_primary = 0 WHERE product_id = ? AND media_type = 'image'").run(productId);
  }
  const id = newId();
  db.prepare(`
    INSERT INTO pim_core_media(id, product_id, media_type, url, alt_text, is_primary, sort_order)
    VALUES (?,?,?,?,?,?,?)
  `).run(id, productId, type, url, altText || null, isPrimary ? 1 : 0, sortOrder || 0);
  return db.prepare("SELECT * FROM pim_core_media WHERE id = ?").get(id);
}

function validateMedia(productId) {
  const rows = db.prepare("SELECT * FROM pim_core_media WHERE product_id = ?").all(productId);
  const images = rows.filter((r) => r.media_type === "image");
  const primary = images.filter((r) => r.is_primary);
  return {
    total: rows.length,
    images: images.length,
    hasPrimary: primary.length === 1,
    valid: images.length > 0 && primary.length === 1,
  };
}

module.exports = { addMedia, validateMedia, MEDIA_TYPE };
