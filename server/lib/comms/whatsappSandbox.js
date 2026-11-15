/**
 * Pusat WhatsApp sandbox. Inbound verify only.
 * Replay state is an isolated SQLite file, not a process-local Set.
 * Does not send, migrate, or touch personal chats or Guardian SQLite.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");
const { getAgentExact } = require("../buzzardNative/core/identityRegistry");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");

const SKEW_MS = 300_000;

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function openDb(dbPath) {
  assertNotGuardian(dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(dbPath);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS wa_events (
      event_id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      payload_hash TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      received_at TEXT NOT NULL,
      from_id TEXT,
      conversation_id TEXT
    );
    CREATE TABLE IF NOT EXISTS wa_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      code TEXT NOT NULL,
      at TEXT NOT NULL,
      detail TEXT
    );
    CREATE TABLE IF NOT EXISTS wa_conversations (
      conversation_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      peer TEXT,
      last_text TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

function createWhatsappSandbox({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-wa-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  const db = openDb(resolved);
  const mem = createMultiMemory();

  function audit(eventId, code, detail) {
    db.prepare(`INSERT INTO wa_audit (event_id, code, at, detail) VALUES (?,?,?,?)`).run(
      eventId || null,
      code,
      new Date().toISOString(),
      detail ? JSON.stringify(detail) : null
    );
  }

  function status() {
    return {
      connected: false,
      liveAccount: false,
      numberMigrated: false,
      messagesSent: 0,
      personalNumberPreserved: true,
      backupsUntouched: true,
      durableReplay: true,
      dbPath: resolved,
    };
  }

  function send() {
    return { ok: false, code: "WHATSAPP_SEND_DENIED", sent: false, live: false };
  }

  function migrateNumber() {
    return { ok: false, code: "NUMBER_MIGRATION_DENIED" };
  }

  function verifyInbound({ payload, header, secret, timestamp } = {}) {
    if (!secret) {
      audit(null, "WEBHOOK_SECRET_REQUIRED", {});
      return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", sent: false };
    }
    if (!header) {
      audit(null, "MISSING_SIGNATURE", {});
      return { ok: false, code: "MISSING_SIGNATURE", sent: false };
    }
    if (timestamp == null || timestamp === "") {
      audit(null, "TIMESTAMP_REQUIRED", {});
      return { ok: false, code: "TIMESTAMP_REQUIRED", sent: false };
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SKEW_MS) {
      audit(null, "TIMESTAMP_SKEW", { timestamp });
      return { ok: false, code: "TIMESTAMP_SKEW", sent: false };
    }
    const expected = crypto.createHmac("sha256", String(secret)).update(String(payload || "")).digest("hex");
    if (expected !== header) {
      audit(null, "INVALID_HMAC", {});
      return { ok: false, code: "INVALID_HMAC", sent: false, hmacIsSignature: false };
    }
    let body = {};
    try {
      body = JSON.parse(payload);
    } catch {
      audit(null, "INVALID_PAYLOAD", {});
      return { ok: false, code: "INVALID_PAYLOAD", sent: false };
    }
    const payloadHash = crypto.createHash("sha256").update(String(payload || "")).digest("hex");
    const messageId = String(body.id || body.messageId || payloadHash);
    const eventId = messageId;
    const from = String(body.from || "unknown");
    const text = String(body.text || "");
    const conversationId = `wa:${from}`;

    const claimed = db.transaction(() => {
      const existing = db.prepare(`SELECT event_id FROM wa_events WHERE event_id = ? OR message_id = ?`).get(eventId, messageId);
      if (existing) return false;
      db.prepare(
        `INSERT INTO wa_events (event_id, message_id, payload_hash, timestamp_ms, received_at, from_id, conversation_id)
         VALUES (?,?,?,?,?,?,?)`
      ).run(eventId, messageId, payloadHash, ts, new Date().toISOString(), from, conversationId);
      db.prepare(
        `INSERT INTO wa_conversations (conversation_id, owner_id, peer, last_text, updated_at)
         VALUES (?, 'banu_hanim', ?, ?, ?)
         ON CONFLICT(conversation_id) DO UPDATE SET last_text = excluded.last_text, updated_at = excluded.updated_at`
      ).run(conversationId, from, text, new Date().toISOString());
      return true;
    })();

    if (!claimed) {
      audit(eventId, "REPLAY", { conversationId });
      return { ok: false, code: "REPLAY", sent: false, eventId, conversationId };
    }

    const stored = mem.put({
      actorId: "banu_hanim",
      ownerId: "banu_hanim",
      type: "personal",
      key: conversationId,
      value: { text, at: new Date().toISOString() },
    });
    audit(eventId, "ACCEPTED", { conversationId, owner: "banu_hanim" });
    const bound = db.prepare(`SELECT owner_id, conversation_id FROM wa_conversations WHERE conversation_id = ?`).get(conversationId);
    return {
      ok: true,
      sent: false,
      live: false,
      hmacIsSignature: false,
      eventId,
      conversationId,
      namespace: stored.namespace || getAgentExact("banu_hanim").memory_namespace,
      ownerId: bound.owner_id,
      normalized: { from, text },
      outbound: send(),
    };
  }

  function events() {
    return db.prepare(`SELECT * FROM wa_events ORDER BY received_at`).all();
  }

  function audits() {
    return db.prepare(`SELECT * FROM wa_audit ORDER BY id`).all();
  }

  function close() {
    db.close();
  }

  return { status, send, migrateNumber, verifyInbound, events, audits, close, dbPath: resolved };
}

let defaultBox = null;

function box() {
  if (!defaultBox) {
    defaultBox = createWhatsappSandbox({
      dbPath: path.join(os.tmpdir(), `buzzard-wa-default-${process.pid}.sqlite`),
    });
  }
  return defaultBox;
}

function status() {
  return box().status();
}
function send() {
  return box().send();
}
function migrateNumber() {
  return box().migrateNumber();
}
function verifyInbound(input) {
  return box().verifyInbound(input);
}

module.exports = { status, send, migrateNumber, verifyInbound, createWhatsappSandbox };
