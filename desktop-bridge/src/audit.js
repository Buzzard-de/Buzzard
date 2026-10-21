const fs = require("fs");
const path = require("path");
const { redactValue } = require("./redact");
const { ensureDir } = require("./paths");
const { nowIso } = require("./schema");

function auditFile(home) {
  return path.join(home, "audit.jsonl");
}

function appendAudit(home, entry) {
  ensureDir(home);
  const row = redactValue({
    at: nowIso(),
    ...entry,
  });
  fs.appendFileSync(auditFile(home), `${JSON.stringify(row)}\n`, { encoding: "utf8" });
  return row;
}

function readAudit(home, limit = 200) {
  const file = auditFile(home);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { at: null, event: "AUDIT_PARSE_ERROR", rawLength: line.length };
    }
  });
}

module.exports = { appendAudit, readAudit, auditFile };
