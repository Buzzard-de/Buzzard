const { resolveIdentity } = require("./councilAliasMap");

const DANGEROUS = Object.freeze([
  "GIT_PUSH",
  "GIT_MERGE",
  "DEPLOY",
  "PRODUCTION_WRITE",
  "PAYMENT_ACTIVATE",
  "SALES_ACTIVATE",
  "DATA_EXPORT",
  "DATA_DELETE",
  "SECURITY_POLICY_CHANGE",
  "CLONE_OFFICIAL_VOICE",
  "TAX_PAY",
  "TAX_FILE_RETURN",
  "BANK_TRANSFER",
  "CUSTOMS_FILE_DECLARATION",
  "CUSTOMS_RELEASE",
  "CUSTOMS_LEGAL_APPROVE",
  "STOCK_BUY",
  "SUPPLIER_PAY",
  "PRICE_PUBLISH_LIVE",
  "SEO_LIVE_PUBLISH",
  "CUSTOMER_REFUND",
  "ORDER_CANCEL",
  "SALES_WRITE",
  "PHONE_LIVE_CALL",
  "SHIPMENT_CREATE",
  "LIVE_PAYMENT",
  "FIAT_POLICY_CHANGE",
  "LIVE_CONNECTOR",
  "CARD_STORE",
  "DEPLOYMENT",
  "POLICY_CHANGE",
]);

const SAFE = Object.freeze({
  pusat: [
    "ASSIGN_TASK",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_SHARED_MEMORY",
  ],
  sinan_bey: [
    "READ_CODE",
    "ANALYZE_CODE",
    "CREATE_LOCAL_BRANCH",
    "MODIFY_LOCAL_CODE",
    "RUN_TESTS",
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
  ],
  esat_bey: [
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
  ],
  dogu_bey: ["READ_PROJECT_REPORTS", "CREATE_REPORTS", "ACCESS_PRIVATE_MEMORY", "SEND_AGENT_MESSAGE", "REQUEST_APPROVAL"],
  amelia: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  adrian: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  mira: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  leon: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  nedim_bey: [
    "TAX_READ",
    "TAX_ANALYZE",
    "TAX_CALCULATE",
    "TAX_REPORT",
    "TAX_DRAFT",
    "TAX_SOURCE_REVIEW",
    "TAX_APPROVAL_REQUEST",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  tuncay_bey: [
    "CUSTOMS_READ",
    "CUSTOMS_ANALYZE",
    "CUSTOMS_CLASSIFY",
    "CUSTOMS_CALCULATE",
    "CUSTOMS_SCREEN",
    "CUSTOMS_REPORT",
    "CUSTOMS_DOCUMENT_DRAFT",
    "CUSTOMS_HOLD",
    "CUSTOMS_APPROVAL_REQUEST",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  stock_ai: [
    "STOCK_READ",
    "STOCK_COMPARE",
    "STOCK_REPORT",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  category_ai: [
    "CATEGORY_READ",
    "CATEGORY_SUGGEST",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
  ],
  pricing_ai: [
    "PRICE_CALCULATE",
    "PRICE_DRAFT",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  seo_ai: [
    "SEO_DRAFT",
    "SEO_AUDIT",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
  ],
  banu_hanim: [
    "CUSTOMER_READ",
    "CUSTOMER_REPLY_LOW_RISK",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  sales_analysis_ai: ["SALES_READ", "ACCESS_PRIVATE_MEMORY", "SEND_AGENT_MESSAGE", "CREATE_REPORTS"],
  zeynep_hanim: [
    "PHONE_SCRIPT",
    "PHONE_HANDOFF",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
});

const revoked = new Map();
const decisionAudit = [];
const REVOKERS = new Set(["human", "operator"]);

function auditPush(entry) {
  decisionAudit.push({ at: new Date().toISOString(), ...entry });
  if (decisionAudit.length > 1000) decisionAudit.shift();
}

function isRevoked(profileId, perm) {
  return Boolean(revoked.get(profileId)?.has(perm));
}

function allowed(agentId, perm) {
  if (isRevoked(agentId, perm)) return false;
  if (DANGEROUS.includes(perm)) return false;
  if (perm === "ACCESS_PRIVATE_MEMORY") return (SAFE[agentId] || []).includes(perm);
  return (SAFE[agentId] || []).includes(perm);
}

function check(agentId, perm) {
  const resolved = resolveIdentity(agentId);
  if (!resolved.ok) {
    const denied = {
      ok: false,
      agentId,
      perm,
      code: resolved.code || "UNKNOWN_IDENTITY",
      selfElevate: false,
      identitiesMerged: false,
    };
    auditPush({ op: "check", agentId: agentId || null, perm, code: denied.code, ok: false });
    return denied;
  }
  const profileId = resolved.permissionProfileId;
  const revokedNow = isRevoked(profileId, perm);
  const ok = !revokedNow && allowed(profileId, perm);
  const result = {
    ok,
    agentId: profileId,
    requestedId: resolved.requestedId,
    perm,
    code: revokedNow ? "PERMISSION_REVOKED" : ok ? "ALLOW" : DANGEROUS.includes(perm) ? "HUMAN_GATE_REQUIRED" : "PERMISSION_DENIED",
    selfElevate: false,
    identitiesMerged: false,
  };
  auditPush({ op: "check", agentId: result.agentId, requestedId: result.requestedId, perm, code: result.code, ok: result.ok });
  return result;
}

function explicitPermissions(agentId) {
  const resolved = resolveIdentity(agentId);
  if (!resolved.ok) return [];
  const profileId = resolved.permissionProfileId;
  return [...(SAFE[profileId] || [])].filter((perm) => !isRevoked(profileId, perm));
}

function revokePermission({ revokedBy, agentId, perm } = {}) {
  const name = String(perm || "").trim();
  if (!REVOKERS.has(revokedBy)) {
    const denied = { ok: false, code: "REVOCATION_DENIED", revoked: false, immediate: false, perm: name };
    auditPush({ op: "revoke", revokedBy: revokedBy || null, agentId: agentId || null, ...denied });
    return denied;
  }
  const resolved = resolveIdentity(agentId);
  if (!resolved.ok) {
    const denied = { ok: false, code: resolved.code || "UNKNOWN_IDENTITY", revoked: false, immediate: false, perm: name };
    auditPush({ op: "revoke", revokedBy, agentId: agentId || null, ...denied });
    return denied;
  }
  const profileId = resolved.permissionProfileId;
  if (!revoked.has(profileId)) revoked.set(profileId, new Set());
  revoked.get(profileId).add(name);
  const result = { ok: true, code: "REVOKED", agentId: profileId, perm: name, revoked: true, immediate: true };
  auditPush({ op: "revoke", revokedBy, ...result });
  return result;
}

function grantPermission({ grantorId, granteeId, perm } = {}) {
  const grantor = check(grantorId, perm);
  const before = explicitPermissions(granteeId);
  if (!grantor.ok) {
    const denied = {
      ok: false,
      code: grantor.code,
      granted: false,
      permissionIncreased: false,
      granteePermissions: before,
    };
    auditPush({ op: "grant", grantorId: grantorId || null, granteeId: granteeId || null, perm, ...denied });
    return denied;
  }
  const after = explicitPermissions(granteeId);
  const result = {
    ok: false,
    code: "GRANT_DOES_NOT_EXPAND",
    granted: false,
    permissionIncreased: false,
    granteePermissions: after,
    expanded: after.some((name) => !before.includes(name)),
  };
  auditPush({ op: "grant", grantorId, granteeId, perm, code: result.code, permissionIncreased: false });
  return result;
}

function auditDecisions() {
  return decisionAudit.map((entry) => ({ ...entry }));
}

function clearRevocations({ clearedBy } = {}) {
  if (!REVOKERS.has(clearedBy)) {
    const denied = { ok: false, code: "REVOCATION_CLEAR_DENIED", cleared: false };
    auditPush({ op: "clear_revocations", clearedBy: clearedBy || null, ...denied });
    return denied;
  }
  revoked.clear();
  const result = { ok: true, code: "REVOKED_SET_CLEARED", cleared: true, clearedBy };
  auditPush({ op: "clear_revocations", ...result });
  return result;
}

function authorizeDelegated({ actorId, originRequesterId = null, chain = [], perm } = {}) {
  const actors = [];
  if (originRequesterId) actors.push(originRequesterId);
  for (const id of chain || []) {
    if (id != null && String(id).trim() !== "") actors.push(id);
  }
  actors.push(actorId);
  const decisions = actors.map((id) => check(id, perm));
  const sets = actors.map((id) => new Set(explicitPermissions(id)));
  const effective = sets.length
    ? [...sets[0]].filter((name) => sets.every((granted) => granted.has(name)) && !DANGEROUS.includes(name))
    : [];
  const originPerms = originRequesterId ? new Set(explicitPermissions(originRequesterId)) : null;
  const permissionIncreased = originPerms ? effective.some((name) => !originPerms.has(name)) : false;
  const failed = decisions.find((decision) => !decision.ok);
  const ok = !failed && !permissionIncreased;
  return {
    ok,
    perm,
    actors,
    decisions,
    effective,
    permissionIncreased,
    elevated: permissionIncreased,
    code: ok ? "ALLOW" : permissionIncreased ? "DELEGATION_ESCALATION_DENIED" : failed.code,
    selfElevate: false,
    identitiesMerged: false,
  };
}

function selfElevate(agentId, perm) {
  return { ok: false, code: "SELF_ELEVATION_DENIED", agentId, perm };
}

function esatDisableSelf() {
  return check("esat_bey", "SECURITY_POLICY_CHANGE");
}

module.exports = {
  DANGEROUS,
  SAFE,
  allowed,
  check,
  explicitPermissions,
  authorizeDelegated,
  revokePermission,
  grantPermission,
  auditDecisions,
  clearRevocations,
  selfElevate,
  esatDisableSelf,
};
