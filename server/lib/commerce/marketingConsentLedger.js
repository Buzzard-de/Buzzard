/**
 * Isolated marketing consent ledger.
 * The commerce database is never opened. UNKNOWN is the absence of a row.
 * Decision order is the monotonic sequence, not the observed clock.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { assertConsentLedgerPath, migrateMarketingConsentLedger } = require("../db");

const CHANNELS = new Set(["email", "sms", "push", "marketing_tracking"]);
const HEADER = 44;

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function refused(code) {
  return {
    ok: false,
    persisted: false,
    stored: false,
    granted: false,
    duplicate: false,
    code,
    sequence: null,
    decisionId: null,
    productionReady: false,
    marketingSendsOpen: false,
  };
}

function normalizeCustomer(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 64 || raw.includes("\0")) return "";
  return raw;
}

function normalizeSource(value) {
  const raw = String(value || "customer-opt-out").trim().slice(0, 64);
  if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(raw)) return "customer-opt-out";
  return raw;
}

function payloadHash(parts) {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function isConstraint(error) {
  const code = String(error && error.code ? error.code : "");
  return code.includes("CONSTRAINT");
}

function assertSeparatedKey(keyPath, storePath, backupPath) {
  if (typeof keyPath !== "string" || !keyPath.trim()) {
    const error = new Error("KEY_PATH_REQUIRED");
    error.code = "KEY_PATH_REQUIRED";
    throw error;
  }
  const resolved = path.resolve(keyPath.trim());
  const keyDir = path.dirname(resolved);
  const blocked = [storePath, backupPath].filter(Boolean).map((item) => path.dirname(path.resolve(item)));
  if (blocked.includes(keyDir) || path.basename(resolved).toLowerCase().includes("pusat") || isProtectedKeyPath(resolved)) {
    const error = new Error("KEY_BESIDE_STORE");
    error.code = "KEY_BESIDE_STORE";
    throw error;
  }
  return resolved;
}

function isProtectedKeyPath(candidate) {
  const resolved = path.resolve(candidate);
  return resolved.includes(`${path.sep}server${path.sep}data${path.sep}`) || path.basename(resolved) === "buzzard.db";
}

function verifyBackupChain(payload) {
  const decisions = Array.isArray(payload && payload.decisions) ? payload.decisions : null;
  const state = Array.isArray(payload && payload.state) ? payload.state : null;
  const maxSequence = Number(payload && payload.maxSequence);
  if (!decisions || !state || !Number.isInteger(maxSequence) || maxSequence < 0) return "BACKUP_UNVERIFIED";
  if (decisions.length !== maxSequence || state.length > decisions.length) return "BACKUP_UNVERIFIED";
  const keys = new Set();
  for (let index = 0; index < decisions.length; index += 1) {
    const row = decisions[index];
    if (!row || Number(row.sequence) !== index + 1) return "BACKUP_UNVERIFIED";
    if (!CHANNELS.has(row.channel) || row.consent_status !== "WITHDRAWN") return "BACKUP_UNVERIFIED";
    if (Number(row.explicit_grant) !== 0 || Number(row.consent_verified) !== 0) return "BACKUP_UNVERIFIED";
    if (!row.decision_id || !row.customer_id || !row.idempotency_key || !row.payload_hash || !row.source) return "BACKUP_UNVERIFIED";
    if (keys.has(row.idempotency_key)) return "BACKUP_UNVERIFIED";
    keys.add(row.idempotency_key);
    const hash = payloadHash({
      customerId: row.customer_id,
      channel: row.channel,
      status: row.consent_status,
      source: row.source,
      idempotencyKey: row.idempotency_key,
    });
    if (hash !== row.payload_hash) return "BACKUP_UNVERIFIED";
  }
  const latest = new Map();
  for (const row of decisions) latest.set(`${row.customer_id}\0${row.channel}`, row);
  if (state.length !== latest.size) return "BACKUP_UNVERIFIED";
  for (const row of state) {
    const decision = latest.get(`${row.customer_id}\0${row.channel}`);
    if (!decision) return "BACKUP_UNVERIFIED";
    if (row.consent_status !== "WITHDRAWN" || Number(row.sequence) !== Number(decision.sequence)) return "BACKUP_UNVERIFIED";
    if (row.decision_id !== decision.decision_id || Number(row.explicit_grant) !== 0) return "BACKUP_UNVERIFIED";
  }
  return "";
}

function sealConsentBackup(payload, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) return null;
  const plain = Buffer.from(JSON.stringify(payload));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const header = Buffer.alloc(HEADER);
  header.write("BZC1", 0);
  header.writeUInt32BE(1, 4);
  header.writeBigUInt64BE(BigInt(Number(payload.maxSequence) || 0), 8);
  iv.copy(header, 16);
  tag.copy(header, 28);
  return Buffer.concat([header, ciphertext]);
}

function openConsentLedger(dbPath, options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const resolved = assertConsentLedgerPath(dbPath, settings);
  fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
  const Database = loadSqlite();
  const connection = new Database(resolved);
  const busyTimeout = settings.isolatedFixture === true && Number.isInteger(settings.busyTimeout)
    ? Math.max(0, Math.min(settings.busyTimeout, 8000))
    : 8000;
  connection.pragma(`busy_timeout = ${busyTimeout}`);
  connection.pragma("journal_mode = WAL");
  connection.pragma("synchronous = FULL");
  migrateMarketingConsentLedger(connection, settings);
  try {
    fs.chmodSync(resolved, 0o600);
  } catch {
    /* the directory permissions still keep the file with the creating user */
  }

  function prior(idempotencyKey) {
    return connection.prepare(
      `SELECT sequence, decision_id, consent_status, payload_hash, channel, customer_id, explicit_grant, consent_verified
       FROM marketing_consent_decisions WHERE idempotency_key = ?`
    ).get(idempotencyKey);
  }

  function duplicate(row) {
    return {
      ok: false,
      persisted: true,
      stored: true,
      granted: false,
      duplicate: true,
      code: "DUPLICATE_CONSENT",
      sequence: row.sequence,
      decisionId: row.decision_id,
      channel: row.channel,
      consentStatus: row.consent_status,
      productionReady: false,
      marketingSendsOpen: false,
    };
  }

  function writeImmediate(entry) {
    const run = connection.transaction(() => {
      const existing = prior(entry.idempotencyKey);
      if (existing) {
        if (existing.payload_hash !== entry.hash || existing.channel !== entry.channel || existing.customer_id !== entry.customerId) {
          return refused("IDEMPOTENCY_CONFLICT");
        }
        return duplicate(existing);
      }
      const current = connection.prepare(
        "SELECT sequence, consent_status FROM marketing_consent_state WHERE customer_id = ? AND channel = ?"
      ).get(entry.customerId, entry.channel);
      if (entry.status === "GRANTED" && current && current.consent_status === "WITHDRAWN") {
        return refused("WITHDRAWN_HELD");
      }
      const decisionId = crypto.randomUUID();
      const explicit = entry.status === "GRANTED" ? 1 : 0;
      const verified = entry.status === "GRANTED" ? 1 : 0;
      const inserted = connection.prepare(
        `INSERT INTO marketing_consent_decisions(
           decision_id, customer_id, channel, consent_status, idempotency_key, payload_hash, source,
           explicit_grant, consent_verified, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(decisionId, entry.customerId, entry.channel, entry.status, entry.idempotencyKey, entry.hash, entry.source, explicit, verified, entry.observedAt);
      const sequence = Number(inserted.lastInsertRowid);
      connection.prepare(
        `INSERT INTO marketing_consent_state(
           customer_id, channel, consent_status, decision_id, source, sequence, explicit_grant, consent_verified, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id, channel) DO UPDATE SET
           consent_status = excluded.consent_status,
           decision_id = excluded.decision_id,
           source = excluded.source,
           sequence = excluded.sequence,
           explicit_grant = excluded.explicit_grant,
           consent_verified = excluded.consent_verified,
           updated_at = excluded.updated_at
         WHERE excluded.sequence >= marketing_consent_state.sequence
           AND NOT (marketing_consent_state.consent_status = 'WITHDRAWN' AND excluded.consent_status = 'GRANTED')`
      ).run(entry.customerId, entry.channel, entry.status, decisionId, entry.source, sequence, explicit, verified, entry.observedAt, entry.observedAt);
      return {
        ok: false,
        persisted: true,
        stored: true,
        granted: false,
        duplicate: false,
        code: entry.status,
        sequence,
        decisionId,
        channel: entry.channel,
        consentStatus: entry.status,
        productionReady: false,
        marketingSendsOpen: false,
      };
    });
    return run.immediate();
  }

  function record(input = {}) {
    const customerId = normalizeCustomer(input.customerId);
    const channel = String(input.channel || "").toLowerCase();
    const status = String(input.consentStatus || "");
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const source = normalizeSource(input.source);
    if (!customerId || !idempotencyKey || idempotencyKey.length > 200) return refused("CONSENT_REJECTED");
    if (channel === "whatsapp" || !CHANNELS.has(channel)) return refused("CHANNEL_REJECTED");
    if (!status || status === "UNKNOWN" || !["GRANTED", "WITHDRAWN"].includes(status)) return refused("CONSENT_REJECTED");
    if (status === "GRANTED") return refused("GRANT_REFUSED");
    const hash = payloadHash({ customerId, channel, status, source, idempotencyKey });
    const observedAt = typeof input.observedAt === "string" && input.observedAt.trim()
      ? input.observedAt.trim().slice(0, 40)
      : new Date().toISOString();
    try {
      return writeImmediate({ customerId, channel, status, source, idempotencyKey, hash, observedAt });
    } catch (error) {
      if (isConstraint(error)) {
        const row = prior(idempotencyKey);
        if (row && row.payload_hash === hash && row.channel === channel && row.customer_id === customerId) return duplicate(row);
        return refused("IDEMPOTENCY_CONFLICT");
      }
      return refused("CONSENT_STORE_UNAVAILABLE");
    }
  }

  function readCustomer(customerId) {
    const id = normalizeCustomer(customerId);
    const rows = id
      ? connection.prepare(
        "SELECT channel, consent_status, sequence, explicit_grant FROM marketing_consent_state WHERE customer_id = ?"
      ).all(id)
      : [];
    const result = {
      email: "UNKNOWN",
      sms: "UNKNOWN",
      push: "UNKNOWN",
      marketing_tracking: "UNKNOWN",
      durable: rows.length > 0,
      sequences: {},
    };
    for (const row of rows) {
      if (!CHANNELS.has(row.channel)) continue;
      if (row.channel === "marketing_tracking") {
        result.marketing_tracking = row.consent_status === "WITHDRAWN" ? "WITHDRAWN" : "BLOCKED";
        result.sequences[row.channel] = row.sequence;
        continue;
      }
      if (row.consent_status === "WITHDRAWN") result[row.channel] = "WITHDRAWN";
      else if (row.consent_status === "GRANTED" && row.explicit_grant === 1) result[row.channel] = "GRANTED";
      result.sequences[row.channel] = row.sequence;
    }
    return result;
  }

  function readAll() {
    return connection.prepare(
      `SELECT customer_id, channel, consent_status, sequence, explicit_grant
       FROM marketing_consent_state ORDER BY sequence`
    ).all();
  }

  function listDecisions() {
    return connection.prepare(
      `SELECT sequence, decision_id, customer_id, channel, consent_status, idempotency_key, source, created_at
       FROM marketing_consent_decisions ORDER BY sequence`
    ).all();
  }

  function maxSequence() {
    const row = connection.prepare("SELECT COALESCE(MAX(sequence), 0) AS sequence FROM marketing_consent_decisions").get();
    return Number(row.sequence || 0);
  }

  function snapshot() {
    return {
      maxSequence: maxSequence(),
      decisions: connection.prepare(
        `SELECT sequence, decision_id, customer_id, channel, consent_status, idempotency_key, payload_hash, source,
                explicit_grant, consent_verified, created_at
         FROM marketing_consent_decisions ORDER BY sequence`
      ).all(),
      state: connection.prepare(
        `SELECT customer_id, channel, consent_status, decision_id, source, sequence, explicit_grant, consent_verified, created_at, updated_at
         FROM marketing_consent_state ORDER BY sequence`
      ).all(),
    };
  }

  function backupEncrypted({ destination, key, keyPath }) {
    try {
      if (keyPath) assertSeparatedKey(keyPath, resolved, destination);
    } catch (error) {
      return { ok: false, code: error.code || "KEY_BESIDE_STORE", productionReady: false };
    }
    if (!Buffer.isBuffer(key) || key.length !== 32) return { ok: false, code: "KEY_INVALID", productionReady: false };
    assertConsentLedgerPath(destination, settings);
    const body = snapshot();
    const plain = Buffer.from(JSON.stringify(body));
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    const header = Buffer.alloc(HEADER);
    header.write("BZC1", 0);
    header.writeUInt32BE(1, 4);
    header.writeBigUInt64BE(BigInt(body.maxSequence), 8);
    iv.copy(header, 16);
    tag.copy(header, 28);
    fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true, mode: 0o700 });
    fs.writeFileSync(destination, Buffer.concat([header, ciphertext]), { mode: 0o600 });
    return { ok: true, code: "BACKUP_WRITTEN", maxSequence: body.maxSequence, productionReady: false };
  }

  function readBackup(source, key) {
    const bytes = fs.readFileSync(source);
    if (bytes.length < HEADER || bytes.subarray(0, 4).toString() !== "BZC1" || bytes.readUInt32BE(4) !== 1) {
      const error = new Error("BACKUP_INVALID");
      error.code = "BACKUP_INVALID";
      throw error;
    }
    const maxSequence = Number(bytes.readBigUInt64BE(8));
    const iv = bytes.subarray(16, 28);
    const tag = bytes.subarray(28, 44);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(bytes.subarray(44)), decipher.final()]);
    const payload = JSON.parse(plain.toString("utf8"));
    if (Number(payload.maxSequence) !== maxSequence) {
      const error = new Error("BACKUP_INVALID");
      error.code = "BACKUP_INVALID";
      throw error;
    }
    return payload;
  }

  function restoreEncrypted({ source, key }) {
    if (!Buffer.isBuffer(key) || key.length !== 32) return { ok: false, restored: false, code: "KEY_INVALID", productionReady: false };
    let payload;
    try {
      payload = readBackup(source, key);
    } catch (error) {
      return { ok: false, restored: false, code: error.code || "BACKUP_INVALID", productionReady: false };
    }
    const chain = verifyBackupChain(payload);
    if (chain) return { ok: false, restored: false, code: chain, productionReady: false };
    const live = maxSequence();
    if (live > Number(payload.maxSequence)) {
      return { ok: false, restored: false, code: "BACKUP_STALE", productionReady: false, liveSequence: live, backupSequence: Number(payload.maxSequence) };
    }
    const liveRows = connection.prepare(
      "SELECT customer_id, channel, consent_status, sequence FROM marketing_consent_state"
    ).all();
    for (const row of liveRows) {
      if (row.consent_status !== "WITHDRAWN") continue;
      const incoming = payload.state.find((item) => item.customer_id === row.customer_id && item.channel === row.channel);
      if (incoming && (incoming.consent_status !== "WITHDRAWN" || Number(incoming.sequence) < Number(row.sequence))) {
        return { ok: false, restored: false, code: "BACKUP_REGRESSION", productionReady: false };
      }
    }
    const apply = connection.transaction(() => {
      const insertDecision = connection.prepare(
        `INSERT OR IGNORE INTO marketing_consent_decisions(
           sequence, decision_id, customer_id, channel, consent_status, idempotency_key, payload_hash, source,
           explicit_grant, consent_verified, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const row of payload.decisions || []) {
        if (!CHANNELS.has(row.channel) || !["GRANTED", "WITHDRAWN"].includes(row.consent_status)) continue;
        insertDecision.run(row.sequence, row.decision_id, row.customer_id, row.channel, row.consent_status, row.idempotency_key, row.payload_hash, row.source, row.explicit_grant, row.consent_verified, row.created_at);
      }
      const currentState = connection.prepare(
        "SELECT sequence, consent_status FROM marketing_consent_state WHERE customer_id = ? AND channel = ?"
      );
      const upsert = connection.prepare(
        `INSERT INTO marketing_consent_state(
           customer_id, channel, consent_status, decision_id, source, sequence, explicit_grant, consent_verified, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id, channel) DO UPDATE SET
           consent_status = excluded.consent_status,
           decision_id = excluded.decision_id,
           source = excluded.source,
           sequence = excluded.sequence,
           explicit_grant = excluded.explicit_grant,
           consent_verified = excluded.consent_verified,
           updated_at = excluded.updated_at
         WHERE excluded.sequence >= marketing_consent_state.sequence
           AND NOT (marketing_consent_state.consent_status = 'WITHDRAWN' AND excluded.consent_status <> 'WITHDRAWN')`
      );
      for (const row of payload.state || []) {
        if (!CHANNELS.has(row.channel) || !["GRANTED", "WITHDRAWN"].includes(row.consent_status)) continue;
        const current = currentState.get(row.customer_id, row.channel);
        if (current && current.consent_status === "WITHDRAWN" && Number(current.sequence) > Number(row.sequence)) continue;
        upsert.run(row.customer_id, row.channel, row.consent_status, row.decision_id, row.source, row.sequence, row.explicit_grant, row.consent_verified, row.created_at, row.updated_at);
      }
    });
    try {
      apply.immediate();
    } catch {
      return { ok: false, restored: false, code: "CONSENT_STORE_UNAVAILABLE", productionReady: false };
    }
    return { ok: true, restored: true, code: "BACKUP_RESTORED", productionReady: false };
  }

  return {
    path: resolved,
    record,
    readCustomer,
    readAll,
    listDecisions,
    maxSequence,
    backupEncrypted,
    restoreEncrypted,
    journalMode: () => connection.pragma("journal_mode", { simple: true }),
    close() {
      try {
        connection.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        /* closing still releases the handle */
      }
      connection.close();
    },
  };
}

function resolveProductionConsentPath() {
  const configured = process.env.BUZZARD_CONSENT_DB_PATH;
  if (typeof configured !== "string" || !configured.trim()) {
    return { ok: false, code: "CONSENT_STORE_UNAVAILABLE", persisted: false, granted: false, productionReady: false };
  }
  try {
    const resolved = assertConsentLedgerPath(configured);
    return {
      ok: true,
      path: resolved,
      exists: fs.existsSync(resolved),
      persisted: false,
      granted: false,
      productionReady: false,
    };
  } catch (error) {
    return { ok: false, code: error.code || "DATA_PATH_REFUSED", persisted: false, granted: false, productionReady: false };
  }
}

function openProductionConsentLedger() {
  const resolved = resolveProductionConsentPath();
  if (!resolved.ok) return { ...resolved, handle: null };
  if (resolved.exists !== true) {
    return { ok: false, code: "CONSENT_STORE_UNAVAILABLE", persisted: false, granted: false, productionReady: false, handle: null };
  }
  try {
    return { ok: true, handle: openConsentLedger(resolved.path), persisted: false, granted: false, productionReady: false };
  } catch (error) {
    return { ok: false, code: error.code || "CONSENT_STORE_UNAVAILABLE", persisted: false, granted: false, productionReady: false, handle: null };
  }
}

module.exports = {
  openConsentLedger,
  openProductionConsentLedger,
  resolveProductionConsentPath,
  sealConsentBackup,
  assertSeparatedKey,
  PRODUCTION_CONSENT_ENV: "BUZZARD_CONSENT_DB_PATH",
};
