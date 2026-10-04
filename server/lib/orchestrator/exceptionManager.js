const exceptions = require("../exceptionBus");

function classifyError(error) {
  const message = String(error?.message || error || "");
  if (/permission|unauthorized|injection|secret/i.test(message)) {
    return { type: "SECURITY", retry: false, alert: true, approval: false };
  }
  if (/timeout|econnreset|temporar|429/i.test(message)) {
    return { type: "TRANSIENT", retry: true, alert: false, approval: false };
  }
  if (/refund|payment|order|stock/i.test(message)) {
    return { type: "CRITICAL_BUSINESS", retry: false, alert: true, approval: true };
  }
  return { type: "PERMANENT", retry: false, alert: false, approval: false };
}

function capture({ source, agent, tool, request, context, error, conversationId }) {
  const policy = classifyError(error);
  const type = policy.type === "SECURITY" ? exceptions.TYPES.SECURITY_ALERT : exceptions.TYPES.AI_ERROR;
  const row = exceptions.emit({
    type,
    severity: policy.alert ? "CRITICAL" : "HIGH",
    source: source || "orchestrator",
    entity: agent || tool || "orchestrator",
    entityId: conversationId || null,
    correlationId: conversationId || null,
    message: String(error?.message || error || "orchestrator_error"),
    context: { request, context, tool, policy },
    retryable: policy.retry,
    retryPolicy: policy.retry ? "transient" : "none",
  });
  return { ...row, policy };
}

function listOpen(limit = 40) {
  return exceptions.list({ status: "OPEN", limit });
}

module.exports = {
  classifyError,
  capture,
  listOpen,
};
