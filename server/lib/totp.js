const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input) {
  const normalized = String(input || "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret(length = 20) {
  return base32Encode(crypto.randomBytes(length));
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

function verifyTotp(secret, token, { window = 1, step = 30 } = {}) {
  const normalized = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, counter + offset) === normalized) return true;
  }
  return false;
}

function buildOtpAuthUri({ secret, email, issuer = "Buzzard Admin" }) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

module.exports = {
  generateSecret,
  verifyTotp,
  buildOtpAuthUri,
};
