const crypto = require("crypto");
const { db } = require("../db");
const { AUDIT_SOURCE } = require("../../core/productConstants");

function newId() {
  return `paud_${crypto.randomBytes(6).toString("hex")}`;
}

function logChange({
  productId,
  action,
  source = AUDIT_SOURCE.SYSTEM,
  actorId,
  fieldName,
  before,
  after,
  metadata,
}) {
  db.prepare(`
    INSERT INTO pim_core_product_audit(
      id, product_id, action, source, actor_id, field_name, before_json, after_json, metadata_json
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `).run(
    newId(),
    productId,
    action,
    source,
    actorId || null,
    fieldName || null,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    JSON.stringify(metadata || {})
  );
}

function listAudit(productId, limit = 50) {
  return db.prepare(`
    SELECT * FROM pim_core_product_audit WHERE product_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(productId, limit).map((r) => ({
    id: r.id,
    productId: r.product_id,
    action: r.action,
    source: r.source,
    actorId: r.actor_id,
    fieldName: r.field_name,
    before: r.before_json ? JSON.parse(r.before_json) : null,
    after: r.after_json ? JSON.parse(r.after_json) : null,
    createdAt: r.created_at,
  }));
}

module.exports = { logChange, listAudit };
