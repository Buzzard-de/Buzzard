/**
 * Automotive Core — in-memory audit log (structured, no secrets).
 */
const _entries = [];

function recordAudit(entry = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    user: entry.user || "system",
    action: entry.action || "unknown",
    entity: entry.entity || null,
    entityId: entry.entityId || null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    source: entry.source || "automotive_core",
    reason: entry.reason || null,
    approvalId: entry.approvalId || null,
  };
  _entries.unshift(record);
  if (_entries.length > 5000) _entries.length = 5000;
  return record;
}

function listAudit(filters = {}) {
  let rows = [..._entries];
  if (filters.entity) rows = rows.filter((r) => r.entity === filters.entity);
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  if (filters.limit) rows = rows.slice(0, filters.limit);
  return rows;
}

module.exports = {
  recordAudit,
  listAudit,
};
