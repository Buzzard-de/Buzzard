/**
 * Pusat policy adapter for the orchestration facade.
 * Maps facade actions onto the existing Human Approval Center policy
 * and reads one order through the phone assistant. It does not create
 * tasks, approvals, payments, or shipments.
 */

const { classifyAction, HUMAN_REQUIRED } = require("./pusat/actionPolicy");
const { ids } = require("./buzzardNative/core/identityRegistry");
const { resolveIdentity } = require("./buzzardNative/core/councilAliasMap");
const { check } = require("./buzzardNative/core/permissionEngine");

const NOT_IMPLEMENTED_READ_ACTIONS = Object.freeze([
  "CHECK_AVAILABILITY",
  "GET_PRODUCT",
  "CHECK_VARIANT",
  "IDENTIFY_CUSTOMER",
  "CHECK_RETURN_POLICY",
  "CHECK_PRICE",
  "CHECK_SUPPLIER",
]);

/**
 * Facade write names that have one existing HUMAN_REQUIRED policy name.
 * CREATE_EXCHANGE and REQUEST_SUPPLIER_ACTION stay unmapped: no single
 * policy name covers them without implying a refund or a supplier payment.
 */
const FACADE_WRITE_MAP = Object.freeze({
  CHANGE_ORDER: "SALES_WRITE",
  CANCEL_ORDER: "ORDER_CANCEL",
  CREATE_RETURN: "CUSTOMER_REFUND",
  REFUND_HIGH_VALUE: "CUSTOMER_REFUND",
  CANCEL_HIGH_VALUE_ORDER: "ORDER_CANCEL",
  SUPPLIER_PURCHASE: "PURCHASE_ANYTHING",
  MARKETPLACE_ORDER: "SALES_WRITE",
  REAL_PAYMENT_CAPTURE: "LIVE_PAYMENT",
});

const UNMAPPED_FACADE_ACTIONS = Object.freeze([
  "CREATE_EXCHANGE",
  "REQUEST_SUPPLIER_ACTION",
]);

const NOT_IMPLEMENTED_READS = new Set(NOT_IMPLEMENTED_READ_ACTIONS);

function containsCardNumber(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && /^\d{13,19}$/.test(current.replace(/[\s-]/g, ""))) return true;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return false;
}

function closed(extra) {
  return {
    approvalCreated: false,
    taskCreated: false,
    stored: false,
    sideEffectExecuted: false,
    autoEligible: false,
    permissionIncreased: false,
    identitiesMerged: false,
    ...extra,
  };
}

function resolveSeedAgent(agentId) {
  const resolved = resolveIdentity(agentId);
  const seed = ids();
  if (seed.length !== 17 || !resolved.ok || !resolved.nativeId || !seed.includes(resolved.nativeId)) {
    return closed({
      ok: false,
      status: "FAILED",
      errorCode: "UNKNOWN_AGENT",
      identityCode: resolved.code || "UNKNOWN_IDENTITY",
      agentId: null,
    });
  }
  return {
    ok: true,
    agentId: resolved.nativeId,
    requestedId: resolved.requestedId,
    identitiesMerged: false,
  };
}

function notImplemented(action) {
  return closed({
    ok: false,
    status: "NOT_IMPLEMENTED",
    errorCode: "NOT_IMPLEMENTED",
    action: action ? String(action) : null,
    humanRequiredAction: null,
    classification: null,
    risk: null,
  });
}

function acceptedPolicy(policyName) {
  const policy = classifyAction(policyName);
  if (policy.action === "CREATE_REPORTS" || policy.risk === "LOW" || policy.autoEligible === true) return null;
  if (policy.classification !== "HUMAN_REQUIRED") return null;
  if (!HUMAN_REQUIRED.includes(policy.action)) return null;
  return policy;
}

function mapFacadeAction({ action, agentId, payload } = {}) {
  const agent = resolveSeedAgent(agentId);
  if (!agent.ok) return agent;
  if (containsCardNumber(payload) || containsCardNumber(action)) {
    return closed({
      ok: false,
      status: "FAILED",
      errorCode: "CARD_DATA_REJECTED",
      agentId: agent.agentId,
      action: null,
    });
  }
  const name = String(action || "").trim().toUpperCase();
  if (!name || name === "CREATE_REPORTS" || NOT_IMPLEMENTED_READS.has(name) || !FACADE_WRITE_MAP[name]) {
    return notImplemented(name || null);
  }
  const policy = acceptedPolicy(FACADE_WRITE_MAP[name]);
  if (!policy) return notImplemented(name);
  return closed({
    ok: true,
    status: "MAPPED",
    action: name,
    humanRequiredAction: policy.action,
    classification: policy.classification,
    risk: policy.risk,
    agentId: agent.agentId,
    requestedId: agent.requestedId,
  });
}

function orderView(raw) {
  const body = raw && typeof raw === "object" ? raw : {};
  return {
    ok: body.ok === true,
    verified: body.verified === true,
    orderNumber: body.orderNumber || null,
    status: body.status || null,
    statusLabel: body.statusLabel || null,
    trackingNumber: body.trackingNumber || null,
    trackingCarrier: body.trackingCarrier || null,
    message: body.message || null,
    escalate: body.escalate === true,
    errorKey: body.errorKey || null,
  };
}

async function executeReadOnlyBuzzardAction(action, payload, context = {}) {
  const agent = resolveSeedAgent(context.agentId);
  if (!agent.ok) return agent;
  const name = String(action || "").trim().toUpperCase();
  if (containsCardNumber(payload)) {
    return closed({
      ok: false,
      status: "FAILED",
      errorCode: "CARD_DATA_REJECTED",
      agentId: agent.agentId,
      action: name || null,
    });
  }
  if (name !== "GET_ORDER") {
    if (FACADE_WRITE_MAP[name]) {
      return mapFacadeAction({ action: name, agentId: agent.agentId, payload });
    }
    return notImplemented(name || null);
  }

  const body = payload && typeof payload === "object" ? payload : {};
  let raw;
  try {
    const phoneAssistantService = require("./phoneAssistantService");
    raw = await phoneAssistantService.getVerifiedOrderStatus({
      orderNumber: body.orderNumber,
      email: body.email,
      postalCode: body.postalCode,
      locale: body.locale || "de",
    });
  } catch (err) {
    return closed({
      ok: false,
      status: "FAILED",
      errorCode: "GET_ORDER_FAILED",
      errorMessage: "GET_ORDER failed.",
      agentId: agent.agentId,
      action: "GET_ORDER",
    });
  }

  const result = orderView(raw);
  if (result.ok !== true) {
    return closed({
      ok: false,
      status: "FAILED",
      errorCode: "GET_ORDER_FAILED",
      errorKey: result.errorKey,
      agentId: agent.agentId,
      action: "GET_ORDER",
      result,
    });
  }
  return closed({
    ok: true,
    status: "SUCCESS",
    errorCode: null,
    agentId: agent.agentId,
    requestedId: agent.requestedId,
    action: "GET_ORDER",
    result,
  });
}

function assignmentAuthority(agentId) {
  const agent = resolveSeedAgent(agentId);
  if (!agent.ok) return { ...agent, assignAllowed: false };
  const decision = check(agent.agentId, "ASSIGN_TASK");
  const assignAllowed = agent.agentId === "pusat" && decision.ok === true;
  return closed({
    ok: assignAllowed,
    assignAllowed,
    agentId: agent.agentId,
    requestedId: agent.requestedId,
    errorCode: assignAllowed ? null : "ASSIGN_TASK_DENIED",
    code: assignAllowed ? "ALLOW" : decision.code || "ASSIGN_TASK_DENIED",
  });
}

module.exports = {
  NOT_IMPLEMENTED_READ_ACTIONS,
  FACADE_WRITE_MAP,
  UNMAPPED_FACADE_ACTIONS,
  mapFacadeAction,
  executeReadOnlyBuzzardAction,
  assignmentAuthority,
};
