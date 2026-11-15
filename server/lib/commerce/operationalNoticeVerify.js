/**
 * Operational notice authority.
 * Request booleans are not stock or import proof. An unbound source fails closed.
 * The commerce database is never opened.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const EVENT_STATUS = Object.freeze({
  low_stock: new Set(["low", "low_stock"]),
  supplier_stock_update: new Set(["updated", "stock_updated"]),
  supplier_import_failure: new Set(["import_failed", "failed"]),
});

const SOURCE_SCHEMA = `
CREATE TABLE IF NOT EXISTS operational_sources (
  source_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  purpose TEXT,
  PRIMARY KEY (source_id, event_type)
);
`;

let repository = null;

function refusal(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isProtectedSourcePath(candidate) {
  const resolved = path.resolve(candidate);
  const base = path.basename(resolved).toLowerCase();
  if (!base || base === "buzzard.db" || base.startsWith("buzzard_guardian") || base.includes("pusat")) return true;
  const marker = `${path.sep}server${path.sep}data`;
  return resolved.endsWith(marker) || resolved.includes(`${marker}${path.sep}`);
}

function isEphemeralPath(candidate) {
  const resolved = path.resolve(candidate);
  const roots = [path.resolve("/tmp"), path.resolve("/var/tmp"), path.resolve("/private/tmp"), path.resolve(os.tmpdir())];
  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function assertFixturePath(candidate) {
  if (process.env.VITEST !== "true") throw refusal("DATA_PATH_REFUSED");
  if (typeof candidate !== "string" || !candidate.trim() || candidate.includes("\0")) throw refusal("DATA_PATH_REFUSED");
  const resolved = path.resolve(candidate.trim());
  if (isProtectedSourcePath(resolved) || !isEphemeralPath(resolved)) throw refusal("DATA_PATH_REFUSED");
  if (fs.existsSync(resolved)) {
    const listed = fs.lstatSync(resolved);
    if (listed.isSymbolicLink() || !listed.isFile()) throw refusal("DATA_PATH_REFUSED");
  }
  return resolved;
}

function rowFromRecord(row) {
  if (!row) return null;
  return {
    sourceId: String(row.source_id || row.sourceId || ""),
    eventType: String(row.event_type || row.eventType || ""),
    status: String(row.status || "").toLowerCase(),
    purpose: row.purpose == null || row.purpose === "" ? "" : String(row.purpose),
  };
}

function bindOperationalRepository(next) {
  if (!next || typeof next.readSource !== "function") {
    repository = {
      readSource() {
        throw refusal("repository_unavailable");
      },
    };
    return repository;
  }
  repository = next;
  return repository;
}

function unbindOperationalRepository() {
  repository = null;
}

function openIsolatedOperationalFixture(dbPath) {
  const resolved = assertFixturePath(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
  const Database = require("better-sqlite3");
  const connection = new Database(resolved);
  connection.pragma("busy_timeout = 2000");
  connection.exec(SOURCE_SCHEMA);
  const read = connection.prepare(
    "SELECT source_id, event_type, status, purpose FROM operational_sources WHERE source_id = ? AND event_type = ?"
  );
  const insert = connection.prepare(
    "INSERT INTO operational_sources(source_id, event_type, status, purpose) VALUES (?, ?, ?, ?)"
  );
  const fixture = {
    path: resolved,
    readSource(sourceId, eventType) {
      return rowFromRecord(read.get(String(sourceId || ""), String(eventType || "")));
    },
    insertSource(source = {}) {
      insert.run(
        String(source.sourceId || ""),
        String(source.eventType || ""),
        String(source.status || "").toLowerCase(),
        source.purpose == null ? null : String(source.purpose)
      );
      return fixture.readSource(source.sourceId, source.eventType);
    },
    close() {
      if (repository === fixture) repository = null;
      connection.close();
    },
  };
  repository = fixture;
  return fixture;
}

function verifyOperationalNotice(request, policy, eventType) {
  const payload = request && typeof request === "object" ? request : {};
  if (!repository || typeof repository.readSource !== "function") {
    return { ok: false, reason: "repository_unavailable" };
  }
  const sourceId = payload.sourceId == null ? String(payload.sku || "") : String(payload.sourceId);
  let row;
  try {
    row = repository.readSource(sourceId, eventType);
  } catch {
    return { ok: false, reason: "repository_unavailable" };
  }
  const record = rowFromRecord(row);
  if (!record || !record.sourceId || record.eventType !== eventType) return { ok: false, reason: "source_not_found" };
  const allowed = EVENT_STATUS[eventType];
  if (!allowed || !allowed.has(record.status)) return { ok: false, reason: "source_status_mismatch" };
  if (payload.purpose && payload.purpose !== policy.purpose) return { ok: false, reason: "purpose_mismatch" };
  if (record.purpose && record.purpose !== policy.purpose) return { ok: false, reason: "purpose_mismatch" };
  return {
    ok: true,
    reason: "operational_authorized",
    sourceId: record.sourceId,
    status: record.status,
  };
}

module.exports = {
  EVENT_STATUS,
  bindOperationalRepository,
  unbindOperationalRepository,
  openIsolatedOperationalFixture,
  verifyOperationalNotice,
};
