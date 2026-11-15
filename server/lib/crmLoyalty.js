const crypto = require("crypto");
const { db } = require("./db");
const { decideMarketingConsent, persistWithdrawal, persistGrant, projectMarketingConsent } = require("./commerce/marketingConsentGate");

function isEnabled() {
  return process.env.BUZZARD_CRM_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function loyaltyTier(lifetimePoints) {
  const points = Number(lifetimePoints || 0);
  if (points >= 10000) return "Platinum";
  if (points >= 5000) return "Gold";
  if (points >= 1500) return "Silver";
  return "Bronze";
}

function cartKey(userId) {
  return crypto.createHash("sha1").update(`${String(userId)}|buzzard`).digest("hex");
}

function addPoints() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
}

function presentCrmProfile(row, userId) {
  const consent = projectMarketingConsent(userId);
  const profile = {
    user_id: row && row.user_id != null ? row.user_id : userId,
    phone: row && row.phone ? String(row.phone) : "",
    country_code: row && row.country_code ? String(row.country_code) : "",
    language: row && row.language ? String(row.language) : "",
    emailPermission: consent.emailPermission,
    smsPermission: consent.smsPermission,
    pushPermission: consent.pushPermission,
    whatsappPermission: consent.whatsappPermission,
    marketingPermission: consent.marketingPermission,
    granted: false,
    consentVerified: false,
  };
  return { profile, loyalty: null, ...consent };
}

function getCrmProfile(userId) {
  let row = null;
  let loyalty = { points: 0, lifetime_points: 0, tier: "Bronze" };
  try {
    row = db.prepare("SELECT user_id, phone, country_code, language FROM crm_profiles WHERE user_id = ?").get(userId) || null;
    loyalty = db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) || loyalty;
  } catch (error) {
    if (!error || error.code !== "DATABASE_NOT_INITIALIZED") throw error;
  }
  return { ...presentCrmProfile(row, userId), loyalty };
}

function storeCrmContact(userId, request) {
  const fields = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(request, "language")) {
    fields.push("language = ?");
    values.push(String(request.language || "").trim().slice(0, 32));
  }
  if (Object.prototype.hasOwnProperty.call(request, "phone")) {
    fields.push("phone = ?");
    values.push(String(request.phone || "").slice(0, 32));
  }
  if (Object.prototype.hasOwnProperty.call(request, "countryCode")) {
    fields.push("country_code = ?");
    values.push(String(request.countryCode || "").trim().slice(0, 8).toUpperCase());
  }
  if (!fields.length) return { contactStored: false, contactCode: "UNCHANGED" };
  try {
    const result = db.prepare(
      `UPDATE crm_profiles SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).run(...values, Number(userId));
    return { contactStored: Number(result && result.changes) > 0, contactCode: Number(result && result.changes) > 0 ? "CONTACT_STORED" : "CONTACT_ABSENT" };
  } catch (error) {
    return { contactStored: false, contactCode: error && error.code === "DATABASE_NOT_INITIALIZED" ? "DATABASE_NOT_INITIALIZED" : "CONTACT_NOT_STORED" };
  }
}

function explicitTrue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function explicitFalse(value) {
  return value === false || value === 0 || value === "0" || value === "false";
}

function crmConsentIntents(body = {}) {
  const blanketGrant = explicitTrue(body.ok)
    || explicitTrue(body.authorized)
    || explicitTrue(body.granted)
    || body.status === 200
    || explicitTrue(body.consent)
    || explicitTrue(body.approved)
    || explicitTrue(body.verified);
  const blanketWithdraw = body.withdraw === true || body.unsubscribe === true;
  const spec = {
    email: { grant: explicitTrue(body.marketingEmail), withdraw: explicitFalse(body.marketingEmail) },
    sms: { grant: explicitTrue(body.marketingSms), withdraw: explicitFalse(body.marketingSms) },
    push: { grant: explicitTrue(body.marketingPush) || explicitTrue(body.pushOptIn), withdraw: explicitFalse(body.marketingPush) || explicitFalse(body.pushOptIn) },
  };
  const intents = { blanketWithdraw };
  for (const channel of ["email", "sms", "push"]) {
    const withdraw = blanketWithdraw || spec[channel].withdraw;
    intents[channel] = { grant: !withdraw && (blanketGrant || spec[channel].grant), withdraw };
  }
  return intents;
}

function crmConsentDecision(customerId, channel, body, action) {
  const grant = action === "grant";
  return decideMarketingConsent({
    customerId: String(customerId),
    channel,
    action,
    withdraw: !grant,
    consent: grant,
    source: grant ? (body.consentSource || body.source || "") : (body.consentSource || body.source || "customer-opt-out"),
    scope: grant ? (body.consentScope || body.scope || "") : (body.consentScope || body.scope || `marketing-${channel}`),
    consentedAt: grant ? (body.consentAt || body.consentedAt || "") : (body.consentAt || body.consentedAt || "2026-11-15T00:00:00.000Z"),
    timeout: body.timeout === true,
    networkError: body.networkError === true,
    idempotencyKey: `${body.idempotencyKey || customerId}:${channel}:${action}:crm`,
  });
}

function crmConsentResult(id, decisions, persisted, contact = {}) {
  const consent = projectMarketingConsent(id);
  const failed = decisions.find((decision) => decision.code === "TIMEOUT" || decision.code === "NETWORK_ERROR");
  const withdrawn = decisions.some((decision) => decision.code === "CONSENT_WITHDRAWN" || decision.code === "DUPLICATE_CONSENT");
  const durable = persisted === true;
  const marketingPermission = consent.marketingPermission === "CLOSED"
    ? "CLOSED"
    : consent.marketingPermission === "WITHDRAWN" || withdrawn
      ? "WITHDRAWN"
      : decisions.length > 0
        ? "BLOCKED"
        : consent.marketingPermission;
  return {
    ok: false,
    code: failed ? failed.code : durable ? "WITHDRAWN" : withdrawn ? "WITHDRAWN_NOT_PERSISTED" : "CONSENT_UNVERIFIED",
    gateCode: failed ? failed.code : withdrawn ? "CONSENT_WITHDRAWN" : "CONSENT_UNVERIFIED",
    marketingPermission,
    stored: durable,
    persisted: durable,
    granted: false,
    withdrawn,
    consentVerified: false,
    consentSource: "UNKNOWN",
    notificationSent: false,
    customerNotified: false,
    callerFlagIgnored: true,
    marketingSendsOpen: false,
    productionReady: false,
    emailPermission: consent.emailPermission,
    smsPermission: consent.smsPermission,
    pushPermission: consent.pushPermission,
    whatsappPermission: consent.whatsappPermission,
    contactStored: contact.contactStored === true,
    contactCode: contact.contactCode || "UNCHANGED",
  };
}

function upsertCrmProfile(userId, body = {}) {
  const request = body && typeof body === "object" ? body : {};
  const id = String(userId ?? "").trim();
  if (!/^[1-9]\d{0,17}$/.test(id)) {
    decideMarketingConsent({
      customerId: "",
      channel: "email",
      action: "grant",
      idempotencyKey: `crm-missing:${id || "none"}:email:grant`,
    });
    return { ok: false, code: "UNKNOWN", marketingPermission: "UNKNOWN", stored: false, granted: false, consentVerified: false, notificationSent: false };
  }
  const intents = crmConsentIntents(request);
  const decisions = [];
  for (const channel of ["email", "sms", "push"]) {
    if (intents[channel].withdraw) decisions.push(crmConsentDecision(id, channel, request, "withdraw"));
    else if (intents[channel].grant) {
      const decision = crmConsentDecision(id, channel, request, "grant");
      decisions.push(decision);
      persistGrant(decision);
    }
  }
  const contact = storeCrmContact(id, request);
  const withdrawals = decisions.filter((decision) => intents[decision.channel]?.withdraw === true && (decision.code === "CONSENT_WITHDRAWN" || decision.code === "DUPLICATE_CONSENT"));
  const failedClosed = decisions.some((decision) => decision.code === "TIMEOUT" || decision.code === "NETWORK_ERROR" || decision.status === "FAILED");
  if (withdrawals.length === 0 || failedClosed) return crmConsentResult(id, decisions, false, contact);
  const results = withdrawals.map((decision) => persistWithdrawal({
    customerId: id,
    channel: decision.channel,
    idempotencyKey: `${request.idempotencyKey || id}:${decision.channel}:withdraw:crm`,
    source: "crm-opt-out",
  }));
  const persisted = results.length > 0 && results.every((item) => item && item.persisted === true);
  return crmConsentResult(id, decisions, persisted, contact);
}

function getLoyaltyDashboard(userId) {
  const account =
    db.prepare("SELECT * FROM loyalty_accounts WHERE user_id = ?").get(userId) ||
    { points: 0, lifetime_points: 0, tier: "Bronze" };
  const ledger = db
    .prepare("SELECT * FROM loyalty_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50")
    .all(userId);
  const rewards = db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY points_cost").all();
  return { account, ledger, rewards };
}

function earnPoints() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, pointsApplied: false, balance: null, callerFlagIgnored: true };
}

function redeemReward() {
  const { isSalesEnabled } = require("./salesMode");
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, redeemed: false, couponIssued: false, balanceChanged: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, redeemed: false, couponIssued: false, balanceChanged: false, callerFlagIgnored: true };
}

function trackAbandonedCart() {
  return { ok: false, code: "CONSENT_UNVERIFIED", marketingPermission: "BLOCKED", stored: false, cartStored: false, notified: false, customerNotified: false };
}

function markCartRecovered(userId, body = {}) {
  const request = body && typeof body === "object" ? body : {};
  const channel = String(request.channel || "email").toLowerCase();
  const customerId = request.customerId != null && String(request.customerId).trim()
    ? String(request.customerId).trim()
    : String(userId ?? "").trim();
  const send = require("./notificationEngine").canSend({
    customerId,
    cartCustomerId: request.cartCustomerId != null ? String(request.cartCustomerId) : customerId,
    cartId: request.cartId || request.cartKey || "",
    channel,
    cartStatus: request.cartStatus,
    orderStatus: request.orderStatus,
    orderId: request.orderId,
    abandonedAt: request.abandonedAt,
    timeout: request.timeout === true,
    networkError: request.networkError === true,
    mock: request.mock === true,
    synthetic: request.synthetic === true,
    source: request.source,
    action: request.action,
    idempotencyKey: request.idempotencyKey || `cart-recovered:${customerId}:${request.cartId || request.cartKey || ""}:${channel}`,
  }, "abandoned_cart");
  const marketingPermission = channel === "sms"
    ? send.smsPermission
    : channel === "push"
      ? send.pushPermission
      : send.emailPermission;
  return {
    ok: false,
    error: send.code,
    code: send.code,
    status: send.status,
    recovered: false,
    converted: false,
    purchased: false,
    paid: false,
    completed: false,
    sale: false,
    saleRecorded: false,
    orderCreated: false,
    paymentCreated: false,
    revenue: null,
    couponIssued: false,
    pointsApplied: false,
    balanceChanged: false,
    campaignCreated: false,
    notificationSent: false,
    customerNotified: false,
    queued: false,
    sent: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    marketingPermission: marketingPermission || "UNKNOWN",
    emailPermission: send.emailPermission,
    smsPermission: send.smsPermission,
    pushPermission: send.pushPermission,
    consentVerified: false,
    callerFlagIgnored: true,
    callerPermissionIgnored: request.permission === true || request.ok === true || request.status === 200 || request.authorized === true,
    idempotent: true,
    duplicate: send.duplicate === true,
    reasons: send.reasons,
    ignored: true,
  };
}

function listUserOffers(userId) {
  return db
    .prepare("SELECT * FROM offers WHERE user_id = ? AND status = 'active' ORDER BY id DESC")
    .all(userId);
}

function queueRecoveryCampaigns() {
  return { ok: false, queued: 0, stored: false, customerNotified: false, notificationSent: false, code: "CONSENT_UNVERIFIED", marketingPermission: "BLOCKED" };
}

function listSegmentsAdmin() {
  return db.prepare("SELECT * FROM customer_segments ORDER BY id").all();
}

function listAbandonedCartsAdmin() {
  return db
    .prepare("SELECT id, user_id, status, item_count, last_seen_at FROM abandoned_carts ORDER BY last_seen_at DESC LIMIT 200")
    .all()
    .map((row) => ({
      id: row.id,
      status: row.status,
      itemCount: row.item_count,
      sale: false,
      converted: false,
      revenue: null,
      orderCreated: false,
      recoveredIsSale: false,
    }));
}

function listOffersAdmin() {
  return db.prepare("SELECT * FROM offers ORDER BY id DESC LIMIT 200").all();
}

function listLoyaltyAccountsAdmin() {
  return db
    .prepare("SELECT * FROM loyalty_accounts ORDER BY lifetime_points DESC LIMIT 200")
    .all();
}

function getCrmLoyaltyStatus() {
  return {
    version: "1.2.0",
    enabled: isEnabled(),
    totals: {
      crmProfiles: db.prepare("SELECT COUNT(*) n FROM crm_profiles").get().n,
      loyaltyAccounts: db.prepare("SELECT COUNT(*) n FROM loyalty_accounts").get().n,
      rewards: db.prepare("SELECT COUNT(*) n FROM rewards WHERE active = 1").get().n,
      segments: db.prepare("SELECT COUNT(*) n FROM customer_segments").get().n,
      offers: db.prepare("SELECT COUNT(*) n FROM offers WHERE status = 'active'").get().n,
      abandonedCarts: db.prepare("SELECT COUNT(*) n FROM abandoned_carts WHERE status = 'open'").get().n,
      recoveredCarts: db.prepare("SELECT COUNT(*) n FROM abandoned_carts WHERE status = 'recovered'").get().n,
      recoveryCampaigns: db.prepare("SELECT COUNT(*) n FROM recovery_campaigns").get().n,
      salesFromRecovered: null,
      revenue: null,
      conversionCount: null,
      recoveredIsSale: false,
    },
  };
}

module.exports = {
  isEnabled,
  getCrmProfile,
  presentCrmProfile,
  upsertCrmProfile,
  getLoyaltyDashboard,
  earnPoints,
  redeemReward,
  trackAbandonedCart,
  markCartRecovered,
  listUserOffers,
  queueRecoveryCampaigns,
  listSegmentsAdmin,
  listAbandonedCartsAdmin,
  listOffersAdmin,
  listLoyaltyAccountsAdmin,
  getCrmLoyaltyStatus,
  addPoints,
};
