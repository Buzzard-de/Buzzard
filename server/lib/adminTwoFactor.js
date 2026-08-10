const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { generateSecret, verifyTotp, buildOtpAuthUri } = require("./totp");

const dataDir = path.join(__dirname, "..", "data");
const storeFile = path.join(dataDir, "admin-2fa.json");
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const challenges = new Map();
const pendingSetup = new Map();

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readStore() {
  ensureDataDir();
  if (!fs.existsSync(storeFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(storeFile, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getConfig(email) {
  const store = readStore();
  return store[normalizeEmail(email)] || null;
}

function isEnabled(email) {
  const config = getConfig(email);
  return Boolean(config?.enabled && config?.secret);
}

function saveConfig(email, config) {
  const store = readStore();
  store[normalizeEmail(email)] = config;
  writeStore(store);
}

function createChallenge(user) {
  const token = crypto.randomBytes(24).toString("hex");
  challenges.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return token;
}

function consumeChallenge(token) {
  const challenge = challenges.get(token);
  if (!challenge) return null;
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(token);
    return null;
  }
  challenges.delete(token);
  return challenge;
}

function beginSetup(email) {
  const secret = generateSecret();
  const normalized = normalizeEmail(email);
  pendingSetup.set(normalized, { secret, expiresAt: Date.now() + 10 * 60 * 1000 });
  return {
    secret,
    otpauthUri: buildOtpAuthUri({ secret, email: normalized }),
  };
}

function completeSetup(email, code) {
  const normalized = normalizeEmail(email);
  const pending = pendingSetup.get(normalized);
  if (!pending || pending.expiresAt <= Date.now()) {
    pendingSetup.delete(normalized);
    return { ok: false, errorKey: "admin.2fa.setupExpired" };
  }
  if (!verifyTotp(pending.secret, code)) {
    return { ok: false, errorKey: "admin.2fa.invalidCode" };
  }
  saveConfig(normalized, { secret: pending.secret, enabled: true, enabledAt: new Date().toISOString() });
  pendingSetup.delete(normalized);
  return { ok: true };
}

function disable(email, code) {
  const normalized = normalizeEmail(email);
  const config = getConfig(normalized);
  if (!config?.enabled || !verifyTotp(config.secret, code)) {
    return { ok: false, errorKey: "admin.2fa.invalidCode" };
  }
  saveConfig(normalized, { secret: null, enabled: false, disabledAt: new Date().toISOString() });
  return { ok: true };
}

function verifyLoginCode(email, code) {
  const config = getConfig(email);
  if (!config?.enabled || !config.secret) return false;
  return verifyTotp(config.secret, code);
}

function getStatus(email) {
  const config = getConfig(email);
  return {
    enabled: Boolean(config?.enabled),
    enabledAt: config?.enabledAt || null,
  };
}

module.exports = {
  isEnabled,
  createChallenge,
  consumeChallenge,
  beginSetup,
  completeSetup,
  disable,
  verifyLoginCode,
  getStatus,
};
