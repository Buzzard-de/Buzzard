const crypto = require("crypto");

function hashInput(input = {}) {
  const body = JSON.stringify({
    taskId: input.taskId || null,
    resourceType: input.resourceType || null,
    resourceId: input.resourceId || null,
    reason: input.reason || "",
    riskLevel: input.riskLevel || "",
  });
  return crypto.createHash("sha256").update(body).digest("hex");
}

function assertBound(approval) {
  const expected = approval?.metadata?.inputHash;
  if (!expected) return { ok: false, code: "UNBOUND" };
  const actual = hashInput(approval);
  if (actual !== expected) return { ok: false, code: "INPUT_HASH_MISMATCH" };
  return { ok: true, code: "BOUND" };
}

module.exports = { hashInput, assertBound };
