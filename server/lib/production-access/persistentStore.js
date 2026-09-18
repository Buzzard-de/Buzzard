/**
 * Production Access — persistent SQLite store for provider evidence metadata.
 * Append-only; survives server restart when BUZZARD_PRODUCTION_ACCESS_PERSISTENCE is enabled.
 */
const { getDb } = require("../db");

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_access_evidence (
      evidence_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      capability TEXT NOT NULL,
      endpoint TEXT,
      timestamp TEXT NOT NULL,
      correlation_id TEXT,
      request_hash TEXT NOT NULL,
      response_status INTEGER NOT NULL,
      supplier_reference TEXT,
      environment TEXT NOT NULL,
      operator TEXT,
      record_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pae_provider ON production_access_evidence(provider);
  `);
}

function createProductionAccessStore() {
  const db = getDb();
  if (!db) return null;

  ensureTables(db);

  const saveEvidenceStmt = db.prepare(`
    INSERT OR REPLACE INTO production_access_evidence (
      evidence_id, provider, capability, endpoint, timestamp, correlation_id,
      request_hash, response_status, supplier_reference, environment, operator, record_json
    ) VALUES (
      @evidence_id, @provider, @capability, @endpoint, @timestamp, @correlation_id,
      @request_hash, @response_status, @supplier_reference, @environment, @operator, @record_json
    )
  `);

  const listEvidenceStmt = db.prepare(`
    SELECT * FROM production_access_evidence
    WHERE provider = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  return {
    saveEvidence(row) {
      saveEvidenceStmt.run(row);
    },
    listEvidence(provider, limit = 5000) {
      return listEvidenceStmt.all(provider, limit);
    },
  };
}

module.exports = { createProductionAccessStore };
