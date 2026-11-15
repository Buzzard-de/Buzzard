/**
 * Local marketing consent gate.
 * A preference flag is not lawful consent and does not send a message.
 */
const { isSalesEnabled } = require("../salesMode");

const customers = new Map();
const decisions = new Map();
const CHANNELS = new Set(["email", "sms", "push", "marketing_tracking"]);
let ledgerHandle = null;
let ledgerStatus = "UNCONFIGURED";

function blank() {
  return { email: "UNKNOWN", sms: "UNKNOWN", push: "UNKNOWN", marketing_tracking: "UNKNOWN", history: [] };
}

function customerState(id) {
  if (!customers.has(id)) customers.set(id, blank());
  return customers.get(id);
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    granted: false,
    consentVerified: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    adSent: false,
    customerNotified: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    ...extra,
  };
}

function record(state, entry) {
  state.history.push(entry);
}

function permissions(state) {
  return {
    emailPermission: state.email,
    smsPermission: state.sms,
    pushPermission: state.push,
    trackingPermission: state.marketing_tracking || "UNKNOWN",
  };
}

function statusFor(code) {
  if (code === "TIMEOUT" || code === "NETWORK_ERROR") return "FAILED";
  if (code === "CUSTOMER_UNKNOWN" || code === "CHANNEL_UNKNOWN" || code === "CONSENT_UNKNOWN") return "UNKNOWN";
  return "BLOCKED";
}

function decideMarketingConsent(input = {}) {
  const customerId = input.customerId ? String(input.customerId) : "";
  const channel = String(input.channel || "").toLowerCase();
  const key = input.idempotencyKey || `${customerId}:${channel}:${input.action || "grant"}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    const state = customerId ? customerState(customerId) : blank();
    record(state, { customerId: customerId || null, channel: channel || null, code: "DUPLICATE_CONSENT", granted: false });
    return closed("DUPLICATE_CONSENT", prior.status, {
      ...prior,
      ...permissions(state),
      code: "DUPLICATE_CONSENT",
      duplicate: true,
      granted: false,
      messageSent: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const source = input.source ? String(input.source) : "";
  const scope = input.scope ? String(input.scope) : "";
  const consentedAt = Date.parse(String(input.consentedAt || ""));
  const withdraw = input.action === "withdraw" || input.withdraw === true;
  const grantIntent = input.action === "grant" || input.consent === true || input.approved === true || input.verified === true || input.subscribed === true;
  const prechecked = input.prechecked === true || input.defaultChecked === true;
  const conflict = withdraw && grantIntent;
  let code = "CONSENT_UNVERIFIED";

  if (input.timeout === true) code = "TIMEOUT";
  else if (input.networkError === true) code = "NETWORK_ERROR";
  else if (input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") code = "MOCK_NOT_CONSENT";
  else if (!customerId) code = "CUSTOMER_UNKNOWN";
  else if (!CHANNELS.has(channel)) code = "CHANNEL_UNKNOWN";
  else if (prechecked) code = "DEFAULT_CONSENT_REJECTED";
  else if (conflict) code = "CONSENT_CONFLICT";
  else if (!source || !scope || !Number.isFinite(consentedAt)) code = "CONSENT_UNKNOWN";
  else code = "CONSENT_UNVERIFIED";

  const state = customerId ? customerState(customerId) : blank();
  if (CHANNELS.has(channel) && customerId) {
    if (code === "TIMEOUT" || code === "NETWORK_ERROR") state[channel] = "CLOSED";
    else if (withdraw && !conflict && code !== "MOCK_NOT_CONSENT") {
      state[channel] = "WITHDRAWN";
      code = "CONSENT_WITHDRAWN";
    } else if (state[channel] === "WITHDRAWN") code = "CONSENT_WITHDRAWN";
    else if (code === "CONSENT_UNVERIFIED" || code === "DEFAULT_CONSENT_REJECTED" || code === "CONSENT_CONFLICT" || code === "MOCK_NOT_CONSENT") state[channel] = "BLOCKED";
  }

  reasons.push(code);
  const result = closed(code, statusFor(code), {
    reasons,
    customerId: customerId || null,
    channel: CHANNELS.has(channel) ? channel : null,
    ...permissions(state),
    contactAllowed: false,
  });
  record(state, {
    customerId: customerId || null,
    channel: result.channel,
    code,
    granted: false,
    at: Number.isFinite(consentedAt) ? new Date(consentedAt).toISOString() : null,
  });
  decisions.set(key, result);
  return result;
}

function retryMarketingConsent(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0, granted: false, messageSent: false });
  const state = prior.customerId ? customerState(prior.customerId) : blank();
  if (prior.channel && CHANNELS.has(prior.channel) && state[prior.channel] !== "WITHDRAWN") state[prior.channel] = "CLOSED";
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    ...permissions(state),
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    granted: false,
    consentVerified: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    adSent: false,
    duplicate: false,
  });
  record(state, { customerId: prior.customerId, channel: prior.channel, code: next.code, granted: false, at: null });
  decisions.set(key, next);
  return next;
}

function consentHistory(customerId) {
  const state = customerState(String(customerId || ""));
  return state.history.map((entry) => ({ ...entry }));
}

function closedStore() {
  return {
    emailPermission: "CLOSED",
    smsPermission: "CLOSED",
    pushPermission: "CLOSED",
    trackingPermission: "CLOSED",
    trackingGranted: false,
    trackingVerified: false,
    granted: false,
    consentVerified: false,
    messageSent: false,
    marketingSendsOpen: false,
    storeStatus: "UNAVAILABLE",
    contactAllowed: false,
    productionReady: false,
  };
}

function applyDurable(customerId, live) {
  const state = customerState(customerId);
  for (const channel of ["email", "sms", "push"]) {
    if (live[channel] === "WITHDRAWN" || live[channel] === "GRANTED") state[channel] = live[channel];
  }
  if (live.marketing_tracking === "WITHDRAWN") state.marketing_tracking = "WITHDRAWN";
  else if (live.marketing_tracking === "GRANTED") state.marketing_tracking = "BLOCKED";
  return state;
}

function bindConsentLedger(handle) {
  ledgerHandle = handle;
  try {
    if (!handle || typeof handle.readAll !== "function") throw new Error("CONSENT_STORE_UNAVAILABLE");
    const rows = handle.readAll();
    for (const row of rows) {
      if (!row || !CHANNELS.has(row.channel)) continue;
      if (row.channel === "marketing_tracking") {
        if (row.consent_status === "WITHDRAWN") customerState(String(row.customer_id)).marketing_tracking = "WITHDRAWN";
        continue;
      }
      if (row.consent_status === "WITHDRAWN" || (row.consent_status === "GRANTED" && row.explicit_grant === 1)) {
        customerState(String(row.customer_id))[row.channel] = row.consent_status;
      }
    }
    ledgerStatus = "READY";
    return { ok: true, storeStatus: "READY", marketingSendsOpen: false, productionReady: false };
  } catch {
    ledgerStatus = "UNAVAILABLE";
    return { ok: false, storeStatus: "UNAVAILABLE", marketingSendsOpen: false, productionReady: false };
  }
}

function unbindConsentLedger() {
  ledgerHandle = null;
  ledgerStatus = "UNCONFIGURED";
}

function clearConsentMemory() {
  customers.clear();
  decisions.clear();
}

function marketingSendsOpen() {
  return false;
}

function persistGrant(decision) {
  const explicit = decision
    && decision.granted === true
    && decision.consentVerified === true
    && decision.code === "CONSENT_GRANTED";
  if (!explicit) {
    return { ok: false, persisted: false, stored: false, granted: false, code: "GRANT_REFUSED", marketingSendsOpen: false, productionReady: false };
  }
  return { ok: false, persisted: false, stored: false, granted: false, code: "GRANT_REFUSED", marketingSendsOpen: false, productionReady: false };
}

function bindProductionConsentLedger() {
  const { openProductionConsentLedger } = require("./marketingConsentLedger");
  const opened = openProductionConsentLedger();
  if (!opened.ok || !opened.handle) {
    ledgerHandle = null;
    ledgerStatus = "UNAVAILABLE";
    return {
      ok: false,
      storeStatus: "UNAVAILABLE",
      persisted: false,
      granted: false,
      marketingSendsOpen: false,
      productionReady: false,
      code: opened.code || "CONSENT_STORE_UNAVAILABLE",
    };
  }
  return bindConsentLedger(opened.handle);
}

function persistWithdrawal(input = {}) {
  if (ledgerStatus === "UNAVAILABLE") return { persisted: false, stored: false, granted: false, code: "CONSENT_STORE_UNAVAILABLE", marketingSendsOpen: false, productionReady: false };
  if (!ledgerHandle || ledgerStatus !== "READY" || typeof ledgerHandle.record !== "function") {
    return { persisted: false, stored: false, granted: false, code: "CONSENT_STORE_UNAVAILABLE", unconfigured: ledgerStatus === "UNCONFIGURED", marketingSendsOpen: false, productionReady: false };
  }
  try {
    const result = ledgerHandle.record({
      customerId: input.customerId,
      channel: input.channel,
      consentStatus: "WITHDRAWN",
      idempotencyKey: input.idempotencyKey,
      source: input.source || "customer-opt-out",
      explicitGrant: false,
      granted: false,
      consentVerified: false,
    });
    if (!result || result.code === "CONSENT_STORE_UNAVAILABLE") ledgerStatus = "UNAVAILABLE";
    return result;
  } catch {
    ledgerStatus = "UNAVAILABLE";
    return { persisted: false, stored: false, granted: false, code: "CONSENT_STORE_UNAVAILABLE", marketingSendsOpen: false, productionReady: false };
  }
}

function persistTrackingWithdrawal(input = {}) {
  return persistWithdrawal({
    ...input,
    channel: "marketing_tracking",
    source: input.source || "tracking-opt-out",
  });
}

function projectMarketingConsent(customerId) {
  const consent = readMarketingConsent(customerId == null ? "" : String(customerId));
  const unavailable = consent.storeStatus === "UNAVAILABLE";
  const email = consent.emailPermission || "UNKNOWN";
  const sms = consent.smsPermission || "UNKNOWN";
  const push = consent.pushPermission || "UNKNOWN";
  const channels = [email, sms, push];
  let marketingPermission = "UNKNOWN";
  if (unavailable || channels.includes("CLOSED")) marketingPermission = "CLOSED";
  else if (channels.includes("WITHDRAWN")) marketingPermission = "WITHDRAWN";
  else if (channels.includes("BLOCKED")) marketingPermission = "BLOCKED";
  return {
    granted: false,
    consentVerified: false,
    emailPermission: email,
    smsPermission: sms,
    pushPermission: push,
    whatsappPermission: unavailable ? "BLOCKED" : "UNKNOWN",
    trackingPermission: unavailable ? "BLOCKED" : (consent.trackingPermission || "UNKNOWN"),
    trackingGranted: false,
    trackingVerified: false,
    marketingPermission,
    marketingSendsOpen: false,
    productionReady: false,
    storeStatus: consent.storeStatus || "UNCONFIGURED",
    notificationSent: false,
  };
}

function marketingBoxChecked(permission, granted, consentVerified) {
  return granted === true && consentVerified === true && permission === "GRANTED";
}

function readMarketingConsent(customerId) {
  if (ledgerStatus === "UNAVAILABLE") return closedStore();
  const id = String(customerId || "");
  if (ledgerStatus === "READY" && ledgerHandle && typeof ledgerHandle.readCustomer === "function" && id) {
    try {
      const live = ledgerHandle.readCustomer(id);
      applyDurable(id, live);
    } catch {
      ledgerStatus = "UNAVAILABLE";
      return closedStore();
    }
  }
  const state = customers.get(id) || blank();
  return {
    ...permissions(state),
    granted: false,
    consentVerified: false,
    messageSent: false,
    marketingSendsOpen: false,
    storeStatus: ledgerStatus,
    productionReady: false,
  };
}

module.exports = {
  decideMarketingConsent,
  retryMarketingConsent,
  consentHistory,
  readMarketingConsent,
  bindConsentLedger,
  unbindConsentLedger,
  clearConsentMemory,
  marketingSendsOpen,
  persistWithdrawal,
  persistTrackingWithdrawal,
  persistGrant,
  bindProductionConsentLedger,
  projectMarketingConsent,
  marketingBoxChecked,
  CHANNELS,
};
