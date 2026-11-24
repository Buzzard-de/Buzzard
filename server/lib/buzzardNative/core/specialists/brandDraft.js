const crypto = require("crypto");
const { check } = require("../permissionEngine");
const { getAgent } = require("../identityRegistry");

function approvalInputHash({ actorId = null, action = "BRAND_LIVE_PUBLISH", input = {} } = {}) {
  return crypto.createHash("sha256").update(JSON.stringify({ actorId, action, input })).digest("hex");
}

function draft({ actorId, kind = "BRAND_DRAFT", facts = {} } = {}) {
  if (!check(actorId, "CREATE_REPORTS").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const agent = getAgent(actorId);
  const text = [facts.product, facts.occasion, facts.locale || "de"].filter(Boolean).join(" · ");
  return {
    ok: true,
    actorId,
    kind,
    role: agent?.role || null,
    livePublish: false,
    llmCompleted: false,
    text: text || "catalog_mode_greeting",
    memoryNamespace: agent?.memory_namespace || null,
  };
}

function campaignAnalyze({ actorId, rows = [] } = {}) {
  if (!check(actorId, "CREATE_REPORTS").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return {
    ok: true,
    actorId,
    impressions: rows.reduce((s, r) => s + Number(r.impressions || 0), 0),
    liveAds: false,
    spend: 0,
  };
}

function requestApproval({ actorId, action = "BRAND_LIVE_PUBLISH", input = {} } = {}) {
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    actorId,
    action,
    inputHash: approvalInputHash({ actorId, action, input }),
    livePublish: false,
  };
}

module.exports = { draft, campaignAnalyze, requestApproval, approvalInputHash };
