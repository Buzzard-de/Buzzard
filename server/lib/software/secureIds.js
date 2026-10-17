const crypto = require("crypto");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function timingEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function moneyCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const sign = n < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(n) * 100 + 1e-10);
}

function writeAudit(db, kind, subject, details) {
  if (!db) return;
  db.prepare(
    `INSERT INTO software_audit(id, kind, subject, details_json) VALUES(?,?,?,?)`
  ).run(newId("saud"), kind, subject || null, JSON.stringify(details || {}));
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

module.exports = { newId, sha256Hex, timingEqualHex, moneyCents, writeAudit, parseJson };
