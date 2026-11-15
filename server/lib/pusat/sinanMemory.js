/**
 * Partitioned personal memory for Sinan Bey. Other agents cannot read.
 */
const crypto = require("crypto");

const SECTIONS = Object.freeze({
  A: "identity_character",
  B: "software_architecture",
  C: "technical_decisions",
  D: "tasks_projects",
  E: "errors_solutions",
  F: "research_learning",
  G: "council_meetings",
  H: "suleyman_directives",
});

function encodeRecord({ section, key, value, source }) {
  const payload = JSON.stringify({ section, key, value, source: source || "sinan_bey", at: new Date().toISOString() });
  const envKey = process.env.BUZZARD_SINAN_MEMORY_KEY;
  if (!envKey) {
    return { encryption: "UNCONFIGURED", ciphertext: payload, iv: null };
  }
  const iv = crypto.randomBytes(12);
  const aesKey = crypto.createHash("sha256").update(envKey).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryption: "AES-256-GCM",
    ciphertext: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

function decodeRecord(stored) {
  if (!stored) return null;
  if (stored.encryption === "UNCONFIGURED") return JSON.parse(stored.ciphertext);
  const envKey = process.env.BUZZARD_SINAN_MEMORY_KEY;
  if (!envKey) return { error: "KEY_MISSING" };
  const aesKey = crypto.createHash("sha256").update(envKey).digest();
  const buf = Buffer.from(stored.ciphertext, "base64");
  const iv = Buffer.from(stored.iv, "base64");
  const data = buf.subarray(0, buf.length - 16);
  const tag = buf.subarray(buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return JSON.parse(json);
}

module.exports = { SECTIONS, encodeRecord, decodeRecord };
