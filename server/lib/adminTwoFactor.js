const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { verifyTotp } = require("./totp");

const dataDir = path.join(__dirname, "..", "data");
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function storePath() {
  return process.env.BUZZARD_ADMIN_2FA_PATH
    ? path.resolve(process.env.BUZZARD_ADMIN_2FA_PATH)
    : path.join(dataDir, "admin-2fa.json");
}

function userKey(userId) {
  return `user:${String(userId)}`;
}

const challenges = new Map();
const pendingSetup = new Map();

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readStore() {
  ensureDataDir();
  const file = storePath();
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    const { store, changed } = migrateStore(parsed);
    if (changed) writeStore(store);
    return store;
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf8");
}

function migrateStore(store) {
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(store || {})) {
    const record = value && typeof value === "object" ? value : {};
    if (key.startsWith("retired:")) {
      next[key] = { enabled: false, secret: null, userId: null, email: null };
      if (record.secret || record.email || record.enabled) changed = true;
      continue;
    }
    if (key.startsWith("user:") && record.userId && !String(record.userId).includes("@")) {
      next[key] = { ...record, userId: String(record.userId), email: null };
      if (record.email) changed = true;
      continue;
    }
    if (record.userId && !String(record.userId).includes("@")) {
      next[userKey(record.userId)] = { ...record, userId: String(record.userId), email: null };
      changed = true;
      continue;
    }
    const retiredId = crypto.createHash("sha256").update(`retired:${key}`).digest("hex").slice(0, 16);
    next[`retired:${retiredId}`] = { enabled: false, secret: null, userId: null, email: null };
    changed = true;
  }
  return { store: next, changed };
}

function getConfig(userId) {
  if (userId == null || String(userId).includes("@")) return null;
  const store = readStore();
  return store[userKey(userId)] || null;
}

function isEnabled(userId) {
  const config = getConfig(userId);
  return Boolean(config?.enabled && config?.secret);
}

function saveConfig(userId, config) {
  if (userId == null || String(userId).includes("@")) return;
  const store = readStore();
  store[userKey(userId)] = { ...config, userId: String(userId), email: null };
  writeStore(store);
}

function createChallenge(user) {
  const token = crypto.randomBytes(24).toString("hex");
  challenges.set(token, {
    userId: user.id,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return token;
}

function readLiveChallenge(token) {
  const challenge = challenges.get(token);
  if (!challenge) return null;
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(token);
    return null;
  }
  return challenge;
}

function consumeChallenge(token) {
  const challenge = readLiveChallenge(token);
  if (!challenge) return null;
  challenges.delete(token);
  return { userId: challenge.userId, name: challenge.name, role: challenge.role, email: null };
}

function acceptChallenge(token, code) {
  const challenge = readLiveChallenge(token);
  if (!challenge) return { ok: false, reason: "expired", email: null };
  challenges.delete(token);
  if (!verifyLoginCode(challenge.userId, code)) return { ok: false, reason: "code", email: null };
  return {
    ok: true,
    userId: challenge.userId,
    email: null,
    name: challenge.name,
    role: challenge.role,
  };
}

function cancelChallenge(token) {
  return challenges.delete(token);
}

function beginSetup() {
  return { ok: false, secret: null, otpauthUri: null, enabled: false, email: null, code: "TOKEN_UNVERIFIED" };
}

function completeSetup() {
  return { ok: false, enabled: false, email: null, code: "TOKEN_UNVERIFIED" };
}

function disable(userId, code) {
  const config = getConfig(userId);
  const matches = Boolean(config?.enabled && config?.secret && verifyTotp(config.secret, code));
  if (matches) {
    saveConfig(userId, { secret: null, enabled: false, disabledAt: new Date().toISOString() });
  }
  return {
    ok: false,
    cleared: matches,
    enabled: matches ? false : Boolean(config?.enabled),
    email: null,
    secret: null,
    code: matches ? "LOCAL_ONLY" : "TOKEN_UNVERIFIED",
  };
}

function verifyLoginCode(userId, code) {
  const config = getConfig(userId);
  if (!config?.enabled || !config.secret) return false;
  return verifyTotp(config.secret, code);
}

function getStatus(userId) {
  const config = getConfig(userId);
  return {
    enabled: Boolean(config?.enabled),
    enabledAt: config?.enabledAt || null,
  };
}

module.exports = {
  isEnabled,
  createChallenge,
  consumeChallenge,
  acceptChallenge,
  cancelChallenge,
  beginSetup,
  completeSetup,
  disable,
  verifyLoginCode,
  getStatus,
};
