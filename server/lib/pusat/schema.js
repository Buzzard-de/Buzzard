/**
 * Pusat persistence — same SQLite as the rest of Buzzard. Never /tmp.
 */

function addColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function migratePusatSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS core_ai_memory (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      content_json TEXT NOT NULL,
      source TEXT,
      classification TEXT NOT NULL,
      confidence REAL,
      agent_id TEXT,
      task_id TEXT,
      access_roles_json TEXT DEFAULT '["ai_agent","admin"]',
      conflict_of TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_memory_subject ON core_ai_memory(subject);
    CREATE INDEX IF NOT EXISTS idx_ai_memory_kind ON core_ai_memory(kind);
    CREATE INDEX IF NOT EXISTS idx_ai_memory_task ON core_ai_memory(task_id);

    CREATE TABLE IF NOT EXISTS core_ai_exceptions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      task_id TEXT,
      correlation_id TEXT,
      retryable INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'OPEN',
      details_json TEXT DEFAULT '{}',
      last_error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      recovered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_exceptions_task ON core_ai_exceptions(task_id);
    CREATE INDEX IF NOT EXISTS idx_ai_exceptions_status ON core_ai_exceptions(status);
    CREATE INDEX IF NOT EXISTS idx_ai_exceptions_code ON core_ai_exceptions(code);

    CREATE TABLE IF NOT EXISTS core_ai_task_meta (
      task_id TEXT PRIMARY KEY,
      correlation_id TEXT,
      idempotency_key TEXT,
      input_hash TEXT,
      timeout_at TEXT,
      classified_as TEXT,
      agent_code TEXT,
      failure_kind TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_idempotency
      ON core_ai_task_meta(idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_ai_task_correlation ON core_ai_task_meta(correlation_id);
  `);

  addColumn(db, "core_approvals", "expires_at", "expires_at TEXT");
  addColumn(db, "core_approvals", "input_hash", "input_hash TEXT");
  addColumn(db, "core_approvals", "action", "action TEXT");
  addColumn(db, "core_approvals", "requesting_agent", "requesting_agent TEXT");
  addColumn(db, "core_approvals", "expected_side_effects", "expected_side_effects TEXT");
  addColumn(db, "core_approvals", "execution_result", "execution_result TEXT");

  addColumn(db, "core_ai_tasks", "correlation_id", "correlation_id TEXT");
  addColumn(db, "core_ai_tasks", "idempotency_key", "idempotency_key TEXT");
  addColumn(db, "core_ai_tasks", "timeout_at", "timeout_at TEXT");
  addColumn(db, "core_ai_tasks", "input_hash", "input_hash TEXT");
}

module.exports = { migratePusatSchema };
