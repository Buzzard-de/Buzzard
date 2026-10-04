const crypto = require("crypto");
const { db } = require("../db");

function hashKey(scope, key) {
  return crypto.createHash("sha256").update(`${scope}:${key}`).digest("hex").slice(0, 40);
}

function remember(scope, key, result) {
  const id = hashKey(scope, key);
  const existing = db.prepare("SELECT result_json FROM orch_idempotency WHERE id = ?").get(id);
  if (existing) {
    try {
      return { duplicate: true, result: JSON.parse(existing.result_json) };
    } catch {
      return { duplicate: true, result: { code: "IDEMPOTENT_REPLAY" } };
    }
  }
  db.prepare(
    "INSERT INTO orch_idempotency(id, scope, key_hash, result_json) VALUES (?,?,?,?)"
  ).run(id, scope, String(key).slice(0, 180), JSON.stringify(result || {}));
  return { duplicate: false, result };
}

function seen(scope, key) {
  const id = hashKey(scope, key);
  return Boolean(db.prepare("SELECT 1 FROM orch_idempotency WHERE id = ?").get(id));
}

module.exports = {
  remember,
  seen,
  hashKey,
};
