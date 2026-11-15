const { ocrLanguages, compare } = require("../vision/imageOps");
const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");

function analyze({ agentId, op = "ocr" }) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "vision")) return { ok: false, code: "CAPABILITY_DENIED" };
  if (op === "understand") {
    return { ok: false, code: "NOT_IMPLEMENTED", kind: "TEMPLATE_OCR_NOT_UNDERSTANDING", agentId };
  }
  if (op === "ocr") {
    return { ok: true, agentId, ocr: ocrLanguages(), generalVision: false, liveVerified: false };
  }
  if (op === "compare") {
    return { ok: true, agentId, compare: compare(Buffer.from("a"), Buffer.from("b")), generalVision: false };
  }
  return { ok: false, code: "UNKNOWN_OP" };
}

module.exports = { analyze };
