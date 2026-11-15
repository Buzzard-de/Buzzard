/**
 * Durable Pusat control-plane store. Not money, stock, or sales writes.
 */
const crypto = require("crypto");

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

function createDurable(db) {
  if (!db) throw new Error("durable store requires db");
  ensureSchema(db);

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

module.exports = { ensureSchema, createDurable };
