/**
 * Batch inbound email sandbox processor with idempotent keys.
 */
const crypto = require("crypto");
const { processInboundEmail } = require("./incomingEmailProcessor");

function processBatch(messages = []) {
  const results = [];
  const seen = new Set();
  for (const [index, message] of messages.entries()) {
    const key = message.idempotencyKey || crypto.createHash("sha256").update(JSON.stringify(message)).digest("hex");
    if (seen.has(key)) {
      results.push({ index, ok: false, code: "DUPLICATE_MESSAGE", idempotencyKey: key });
      continue;
    }
    seen.add(key);
    const processed = processInboundEmail(message);
    results.push({ index, idempotencyKey: key, ...processed });
  }
  return {
    ok: results.every((row) => row.ok !== false || row.code === "DUPLICATE_MESSAGE"),
    count: results.length,
    escalations: results.filter((row) => row.escalation).length,
    autoSent: 0,
    live: false,
    results,
  };
}

module.exports = { processBatch };