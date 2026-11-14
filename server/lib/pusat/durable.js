/**
 * Durable Pusat control-plane store. Not money, stock, or sales writes.
 * The runtime memory connection is a separate read-only file, never commerce SQLite.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const ALLOWED_TABLES = new Set([
  "pusat_memories",
  "pusat_meetings",
  "pusat_meeting_events",
  "pusat_research",
  "pusat_trade_holds",
  "sqlite_master",
  "sqlite_schema",
]);

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function refuse(message, code) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function fileIdentity(file) {
  const resolved = path.resolve(String(file));
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function referencedTables(sql) {
  const text = String(sql || "");
  if (/\b(attach|detach)\b/i.test(text)) refuse("PUSAT_TABLE_FORBIDDEN", "PUSAT_TABLE_FORBIDDEN");
  const names = [];
  const re = /\b(?:from|into|update|join|table)\s+(?:if\s+not\s+exists\s+)?["'`]?([A-Za-z_][A-Za-z0-9_]*)/gi;
  let match;
  while ((match = re.exec(text))) names.push(match[1]);
  if (!names.length) refuse("PUSAT_SQL_UNVERIFIED", "DATA_PATH_REFUSED");
  for (const name of names) {
    if (!ALLOWED_TABLES.has(name)) refuse("PUSAT_TABLE_FORBIDDEN", "PUSAT_TABLE_FORBIDDEN");
  }
}

function guardReadOnly(raw) {
  return {
    name: raw.name,
    exec(sql) {
      referencedTables(sql);
      if (/^\s*(insert|update|delete|create|alter|drop|replace|reindex|vacuum)\b/i.test(sql)) {
        refuse("PUSAT_MEMORY_READONLY", "PUSAT_TABLE_FORBIDDEN");
      }
      return raw.exec(sql);
    },
    prepare(sql) {
      referencedTables(sql);
      if (/^\s*(insert|update|delete|create|alter|drop|replace|reindex|vacuum)\b/i.test(sql)) {
        refuse("PUSAT_MEMORY_READONLY", "PUSAT_TABLE_FORBIDDEN");
      }
      return raw.prepare(sql);
    },
    close() {
      return raw.close();
    },
  };
}

function openPusatMemory({ dbPath, commercePath } = {}) {
  const { assertNotGuardian } = require("./durableTaskQueue");
  const resolved = assertNotGuardian(dbPath);
  if (commercePath && fileIdentity(resolved) === fileIdentity(commercePath)) {
    refuse("PUSAT_DB_MATCHES_COMMERCE", "DATA_PATH_REFUSED");
  }
  if (!fs.existsSync(path.dirname(resolved))) {
    refuse("ORCH_DB_PATH_UNVERIFIED", "DATA_PATH_REFUSED");
  }
  const Database = loadSqlite();
  const raw = new Database(resolved);
  raw.pragma("busy_timeout = 8000");
  raw.pragma("query_only = ON");
  return createDurable(guardReadOnly(raw), { ensureSchema: false });
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pusat_memories (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      classification TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pusat_meetings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      chair_id TEXT NOT NULL,
      status TEXT NOT NULL,
      minutes_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pusat_meeting_events (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      speaker_id TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pusat_research (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      question TEXT,
      status TEXT NOT NULL,
      verification TEXT,
      findings TEXT,
      sources_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pusat_trade_holds (
      id TEXT PRIMARY KEY,
      destination TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function tableExists(db, name) {
  const row = db.prepare(`SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
  return Boolean(row);
}

function createDurable(db, options = {}) {
  if (!db) throw new Error("durable store requires db");
  if (options.ensureSchema !== false) ensureSchema(db);

  function putMemory({ ownerId, key, value, classification = "personal" }) {
    const id = `mem_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(
      `INSERT INTO pusat_memories (id, owner_id, classification, key, value_json, created_at)
       VALUES (?,?,?,?,?,?)`
    ).run(id, ownerId, classification, key, JSON.stringify(value ?? null), at);
    return { id, ownerId, key, classification, at };
  }

  function getMemory({ ownerId, requesterId }) {
    if (ownerId !== requesterId) {
      return { ok: false, code: "PERSONAL_MEMORY_DENIED" };
    }
    if (!tableExists(db, "pusat_memories")) {
      return { ok: false, code: "PUSAT_TABLE_MISSING", table: "pusat_memories" };
    }
    const records = db
      .prepare(`SELECT id, key, value_json, created_at FROM pusat_memories WHERE owner_id = ? ORDER BY created_at`)
      .all(ownerId)
      .map((r) => ({ id: r.id, key: r.key, value: JSON.parse(r.value_json), at: r.created_at }));
    return { ok: true, records };
  }

  function openMeeting({ chairId = "pusat", date = new Date().toISOString().slice(0, 10) } = {}) {
    const id = `meet_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(`INSERT INTO pusat_meetings (id, date, chair_id, status, minutes_json, created_at) VALUES (?,?,?,?,NULL,?)`).run(
      id,
      date,
      chairId,
      "OPEN",
      at
    );
    return { id, date, chairId, status: "OPEN" };
  }

  function addMeetingEvent({ meetingId, kind, speakerId, payload }) {
    const meeting = db.prepare(`SELECT status FROM pusat_meetings WHERE id = ?`).get(meetingId);
    if (!meeting || meeting.status !== "OPEN") return { ok: false, code: "MEETING_CLOSED" };
    const id = `mev_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(
      `INSERT INTO pusat_meeting_events (id, meeting_id, kind, speaker_id, payload_json, created_at) VALUES (?,?,?,?,?,?)`
    ).run(id, meetingId, kind, speakerId || null, JSON.stringify(payload || {}), new Date().toISOString());
    return { ok: true, id };
  }

  function closeMeeting(meetingId) {
    const meeting = db.prepare(`SELECT * FROM pusat_meetings WHERE id = ?`).get(meetingId);
    if (!meeting) return { ok: false, code: "NOT_FOUND" };
    const events = db.prepare(`SELECT * FROM pusat_meeting_events WHERE meeting_id = ?`).all(meetingId);
    const minutes = { date: meeting.date, events, closedAt: new Date().toISOString() };
    db.prepare(`UPDATE pusat_meetings SET status = 'CLOSED', minutes_json = ? WHERE id = ?`).run(
      JSON.stringify(minutes),
      meetingId
    );
    return { ok: true, minutes };
  }

  function requestResearch({ fromId, topic, question }) {
    const id = `res_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(
      `INSERT INTO pusat_research (id, from_id, topic, question, status, verification, findings, sources_json, created_at)
       VALUES (?,?,?,?, 'QUEUED', NULL, NULL, '[]', ?)`
    ).run(id, fromId, topic, question || "", new Date().toISOString());
    return { id, status: "QUEUED" };
  }

  function completeResearch({ requestId, findings, sources = [] }) {
    const row = db.prepare(`SELECT * FROM pusat_research WHERE id = ?`).get(requestId);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    const dated = (sources || []).filter((s) => s && s.url && s.retrievedAt);
    const verification = dated.length ? "SOURCED" : "UNVERIFIED";
    db.prepare(
      `UPDATE pusat_research SET status = 'COMPLETED', verification = ?, findings = ?, sources_json = ? WHERE id = ?`
    ).run(verification, findings || "", JSON.stringify(dated), requestId);
    return { ok: true, verification, requestId };
  }

  function holdTrade({ destination, reason, payload }) {
    const id = `hold_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(
      `INSERT INTO pusat_trade_holds (id, destination, reason, status, payload_json, created_at) VALUES (?,?,?,?,?,?)`
    ).run(id, destination, reason, "WAITING_APPROVAL", JSON.stringify(payload || {}), new Date().toISOString());
    return { id, status: "WAITING_APPROVAL" };
  }

  function listHolds() {
    if (!tableExists(db, "pusat_trade_holds")) {
      return { ok: false, code: "PUSAT_TABLE_MISSING", table: "pusat_trade_holds" };
    }
    return db.prepare(`SELECT * FROM pusat_trade_holds ORDER BY created_at DESC LIMIT 50`).all();
  }

  return {
    putMemory,
    getMemory,
    openMeeting,
    addMeetingEvent,
    closeMeeting,
    requestResearch,
    completeResearch,
    holdTrade,
    listHolds,
  };
}

module.exports = { ensureSchema, createDurable, openPusatMemory, referencedTables };
