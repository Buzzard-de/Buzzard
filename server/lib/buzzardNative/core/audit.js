const crypto = require("crypto");

const SECRET_RE = /(password|secret|token|api[_-]?key|card|cvv)/i;

function createAudit() {
  const rows = [];
  function log(kind, payload = {}) {
    const safe = JSON.parse(JSON.stringify(payload));
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      for (const k of Object.keys(o)) {
        if (SECRET_RE.test(k)) o[k] = "[REDACTED]";
        else walk(o[k]);
      }
    };
    walk(safe);
    const body = JSON.stringify({ kind, safe, at: Date.now() });
    const row = {
      id: `aud_${crypto.randomBytes(3).toString("hex")}`,
      kind,
      at: new Date().toISOString(),
      agentId: payload.agentId || null,
      taskId: payload.taskId || null,
      integrity: crypto.createHash("sha256").update(body).digest("hex"),
      payload: safe,
    };
    rows.push(row);
    return row;
  }
  return { log, all: () => rows.slice() };
}

module.exports = { createAudit };
