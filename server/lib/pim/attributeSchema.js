const { db } = require("../db");

function getSchema(categoryId) {
  const row = db
    .prepare("SELECT * FROM pim_core_attribute_schemas WHERE category_id = ? AND active = 1 ORDER BY version DESC LIMIT 1")
    .get(categoryId);
  if (!row) return { categoryId, attributes: [] };
  return { categoryId, version: row.version, attributes: JSON.parse(row.schema_json).attributes || [] };
}

function setSchema(categoryId, attributes) {
  const version =
    (db.prepare("SELECT MAX(version) v FROM pim_core_attribute_schemas WHERE category_id = ?").get(categoryId)?.v || 0) + 1;
  db.prepare(`
    INSERT INTO pim_core_attribute_schemas(category_id, schema_json, version) VALUES (?,?,?)
  `).run(categoryId, JSON.stringify({ attributes }), version);
  return getSchema(categoryId);
}

function validateAttributes(categoryId, attributes) {
  const schema = getSchema(categoryId);
  const issues = [];
  for (const def of schema.attributes) {
    if (def.required && !attributes?.[def.key]) {
      issues.push({ key: def.key, error: "required" });
    }
  }
  return { ok: issues.length === 0, issues, schema: schema.attributes };
}

module.exports = { getSchema, setSchema, validateAttributes };
