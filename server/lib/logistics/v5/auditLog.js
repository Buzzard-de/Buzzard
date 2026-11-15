/**
 * In-memory audit log. Isolated; never writes production.
 */
const entries = [];

function audit(event, payload = {}) {
  const row = {
    id: `aud-${entries.length + 1}`,
    at: new Date().toISOString(),
    event,
    live: false,
    payload,
  };
  entries.push(row);
  return row;
}

function listAudit() {
  return [...entries];
}

function resetAudit() {
  entries.length = 0;
}

module.exports = { audit, listAudit, resetAudit };
