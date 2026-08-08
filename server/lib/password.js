const crypto = require("crypto");

const SCRYPT_PREFIX = "scrypt:";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, SCRYPT_PARAMS);
  return `${SCRYPT_PREFIX}${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  if (String(storedHash).startsWith(SCRYPT_PREFIX)) {
    const parts = String(storedHash).slice(SCRYPT_PREFIX.length).split(":");
    if (parts.length !== 2) return false;
    const [saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(String(password), salt, 64, SCRYPT_PARAMS);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }

  const legacy = crypto.createHash("sha256").update(String(password)).digest("hex");
  const normalized = String(storedHash).startsWith("sha256:") ? storedHash.slice(7) : storedHash;
  if (legacy.length !== normalized.length) return false;
  return crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(normalized));
}

function needsRehash(storedHash) {
  return !String(storedHash || "").startsWith(SCRYPT_PREFIX);
}

module.exports = { hashPassword, verifyPassword, needsRehash };
