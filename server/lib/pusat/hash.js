const crypto = require("crypto");

function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function hashInput(value) {
  return crypto.createHash("sha256").update(stableStringify(value ?? {})).digest("hex");
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function newCorrelationId() {
  return `corr_${crypto.randomBytes(8).toString("hex")}`;
}

module.exports = { stableStringify, hashInput, newId, newCorrelationId };
