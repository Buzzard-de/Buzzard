/**
 * Notification admission.
 * Uses the existing core_approvals chain for operational notices.
 * Legacy boolean consent is never a grant. Providers stay uncalled.
 */
const CHANNELS = new Set(["email", "sms", "push", "in_app"]);

const EVENT_CLASS = Object.freeze({
  new_order: "transactional",
  payment_confirmed: "transactional",
  order_shipped: "transactional",
  order_delivered: "transactional",
  return_request: "transactional",
  refund: "transactional",
  new_customer: "transactional",
  abandoned_cart: "marketing",
  review_request: "marketing",
  low_stock: "operational",
  supplier_stock_update: "operational",
  supplier_import_failure: "operational",
});

const LEGACY_CONSENT_KEYS = [
  "marketing_email",
  "marketing_sms",
  "marketing_whatsapp",
  "email_opt_in",
  "sms_opt_in",
  "push_opt_in",
  "marketingConsent",
  "marketing",
];

const COMMERCIAL_ACTIONS = new Set(["order", "payment", "refund", "return", "checkout", "capture", "payout"]);

function classifyNotification(eventType) {
  return EVENT_CLASS[eventType] || null;
}

function normalizeChannel(channel) {
  return String(channel || "email").trim().toLowerCase();
}

function held(extra = {}) {
  return {
    ok: false,
    sent: false,
    executed: false,
    dryRun: true,
    providerCalled: false,
    scheduled: false,
    retried: false,
    ...extra,
  };
}

function isLegacyConsent(value) {
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  return LEGACY_CONSENT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function grantRecords(consent) {
  if (!consent || typeof consent !== "object" || Array.isArray(consent)) return [];
  if (Array.isArray(consent.channels)) return consent.channels;
  if (consent.channels && typeof consent.channels === "object") return Object.values(consent.channels);
  return [consent];
}

function matchGrant(consent, channel) {
  if (channel === "whatsapp") return { ok: false, code: "WHATSAPP_CLOSED" };
  if (isLegacyConsent(consent)) return { ok: false, code: "MARKETING_CONSENT_REQUIRED" };
  const records = grantRecords(consent).filter((record) => record && record.channel === channel);
  if (records.length !== 1) return { ok: false, code: "MARKETING_CONSENT_REQUIRED" };
  const record = records[0];
  if (isLegacyConsent(record)) return { ok: false, code: "MARKETING_CONSENT_REQUIRED" };
  if (record.status !== "GRANTED" || record.verified !== true) {
    return { ok: false, code: "MARKETING_CONSENT_REQUIRED" };
  }
  return { ok: true };
}

function hasSubject(proof) {
  return ["orderNumber", "transactionId", "customerId", "subjectId"].some((key) => {
    const value = proof[key];
    return (typeof value === "string" && value.length > 0) || (typeof value === "number" && Number.isFinite(value));
  });
}

function matchTransaction(proof) {
  if (!proof || proof.trusted !== true || proof.verified !== true) {
    return { ok: false, code: "TRANSACTION_UNVERIFIED" };
  }
  if (!hasSubject(proof) || typeof proof.source !== "string" || !proof.source || typeof proof.status !== "string" || !proof.status) {
    return { ok: false, code: "TRANSACTION_UNVERIFIED" };
  }
  return { ok: true };
}

function matchOperational(proof) {
  if (!proof || proof.trusted !== true || proof.verified !== true) {
    return { ok: false, code: "OPERATIONAL_SOURCE_UNVERIFIED" };
  }
  if (typeof proof.source !== "string" || !proof.source || typeof proof.status !== "string" || !proof.status) {
    return { ok: false, code: "OPERATIONAL_SOURCE_UNVERIFIED" };
  }
  return { ok: true };
}

function decideNotification(input = {}) {
  const channel = normalizeChannel(input.channel || "email");
  const kind = classifyNotification(input.eventType);
  if (channel === "whatsapp") return held({ code: "WHATSAPP_CLOSED", kind, channel });
  if (!kind) return held({ code: "UNKNOWN_EVENT", kind: null, channel });
  if (!CHANNELS.has(channel)) return held({ code: "CHANNEL_REJECTED", kind, channel });

  if (kind === "marketing") {
    const grant = matchGrant(input.consent, channel);
    if (!grant.ok) return held({ code: grant.code, kind, channel });
    return held({ ok: true, code: "DRY_RUN", kind, channel, held: true });
  }

  if (kind === "transactional") {
    const transaction = matchTransaction(input.transaction);
    if (!transaction.ok) return held({ code: transaction.code, kind, channel });
    return held({ ok: true, code: "DRY_RUN", kind, channel, held: true });
  }

  const operational = matchOperational(input.operational);
  if (!operational.ok) return held({ code: operational.code, kind, channel, aiInitiated: Boolean(input.aiInitiated) });
  const { assertPeripheralExecution, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const gate = assertPeripheralExecution({
    source: PERIPHERAL_AUTOMATION_SOURCES.NOTIFICATION,
    jobType: input.eventType,
    jobId: input.jobId,
    approval: input.approval,
  });
  if (!gate.ok) {
    return held({
      code: gate.code,
      kind,
      channel,
      pendingApproval: gate.code === "APPROVAL_REQUIRED",
      aiInitiated: Boolean(input.aiInitiated),
    });
  }
  return held({ ok: true, code: "DRY_RUN", kind, channel, held: true, aiInitiated: Boolean(input.aiInitiated) });
}

function holdOperationalNotice({ eventType, channel = "email", operational, actor, subjectId, deps, aiInitiated = false, jobId, approval }) {
  const decision = decideNotification({ eventType, channel, operational, approval, jobId, aiInitiated });
  if (decision.code !== "APPROVAL_REQUIRED") return decision;
  const { admitPeripheralAutomation, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const admitted = admitPeripheralAutomation({
    source: PERIPHERAL_AUTOMATION_SOURCES.NOTIFICATION,
    jobType: eventType,
    actor: actor || (aiInitiated ? "ai_notification" : "notification_engine"),
    subjectId: subjectId == null ? null : String(subjectId),
    deps,
  });
  return held({
    ...decision,
    ok: Boolean(admitted.ok),
    pendingApproval: true,
    approval: admitted.approval || null,
    job: null,
    jobId: admitted.jobId || null,
    status: admitted.status,
    code: admitted.ok ? "APPROVAL_REQUIRED" : admitted.code,
    kind: "operational",
    aiInitiated: Boolean(aiInitiated),
  });
}

function evaluateSupportReply(message) {
  if (typeof message === "string" && message.trim()) {
    return held({ ok: true, code: "DRY_RUN", kind: "customer_notice", channel: "in_app", commercialAction: false });
  }
  if (message && typeof message === "object") {
    const action = String(message.action || message.type || "").toLowerCase();
    const commercial = COMMERCIAL_ACTIONS.has(action) || Object.keys(message).some((key) => COMMERCIAL_ACTIONS.has(key));
    if (commercial) {
      return held({ code: "SUPPORT_COMMERCIAL_ACTION_REFUSED", kind: "customer_notice", channel: "in_app", commercialAction: false });
    }
  }
  return held({ code: "SUPPORT_REPLY_INVALID", kind: "customer_notice", channel: "in_app", commercialAction: false });
}

function decideCustomerNotice({ channel = "in_app", message, eventType } = {}) {
  const normalized = normalizeChannel(channel);
  if (normalized === "whatsapp") return held({ code: "WHATSAPP_CLOSED", kind: "customer_notice", channel: normalized });
  if (eventType && classifyNotification(eventType)) {
    return held({ code: "CUSTOMER_NOTICE_CHANNEL_MISUSE", kind: classifyNotification(eventType), channel: normalized });
  }
  const reply = evaluateSupportReply(message);
  if (!reply.ok) return { ...reply, channel: normalized };
  if (!CHANNELS.has(normalized)) return held({ code: "CHANNEL_REJECTED", kind: "customer_notice", channel: normalized });
  return held({ ok: true, code: "DRY_RUN", kind: "customer_notice", channel: normalized, commercialAction: false, held: true });
}

function retryNotification(notice = {}, options = {}) {
  return {
    ...decideNotification({
      eventType: notice.eventType,
      channel: notice.channel || options.channel,
      consent: options.consent,
      transaction: options.transaction,
      operational: options.operational,
      approval: options.approval,
      jobId: options.jobId || notice.jobId,
      aiInitiated: options.aiInitiated,
    }),
    retried: false,
  };
}

function scheduleNotification(notice = {}, options = {}) {
  const decision = retryNotification(notice, options);
  return { ...decision, scheduled: false, armed: false };
}

function callProvider() {
  return { called: false, code: "PROVIDER_DISABLED", dryRun: true, sent: false };
}

module.exports = {
  EVENT_CLASS,
  classifyNotification,
  decideNotification,
  holdOperationalNotice,
  evaluateSupportReply,
  decideCustomerNotice,
  retryNotification,
  scheduleNotification,
  callProvider,
  isLegacyConsent,
};
