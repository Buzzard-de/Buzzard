const { db } = require("./db");
const { isSalesEnabled } = require("./salesMode");
const { decideMarketingConsent, readMarketingConsent, persistWithdrawal, persistGrant } = require("./commerce/marketingConsentGate");
const { assessReferral } = require("./commerce/referralAuthorityGate");

function isEnabled() {
  return process.env.BUZZARD_MARKETING_LOYALTY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function seedTiers() {
  if (db.prepare("SELECT id FROM mktloy_loyalty_tiers LIMIT 1").get()) return;

  const insert = db.prepare(`
    INSERT INTO mktloy_loyalty_tiers(code, name, min_points, multiplier, benefits_json)
    VALUES(?,?,?,?,?)
  `);
  insert.run("BRONZE", "Bronze", 0, 1, '{"shipping":"standard"}');
  insert.run("SILVER", "Silver", 1000, 1.1, '{"discount":5}');
  insert.run("GOLD", "Gold", 5000, 1.25, '{"discount":10,"priority_support":true}');
  insert.run("PLATINUM", "Platinum", 15000, 1.5, '{"discount":15,"priority_support":true,"early_access":true}');
}

function refreshTier(customerId) {
  const account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) return;

  const tier = db
    .prepare("SELECT * FROM mktloy_loyalty_tiers WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1")
    .get(account.lifetime_points);
  if (tier && tier.id !== account.tier_id) {
    db.prepare(`
      UPDATE mktloy_loyalty_accounts
      SET tier_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = ?
    `).run(tier.id, customerId);
  }
}

function createCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, created: false, stored: false, discount: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, created: false, stored: false, discount: null, callerFlagIgnored: true };
}

function listCampaigns() {
  return db.prepare("SELECT * FROM mktloy_campaigns ORDER BY id DESC").all();
}

function updateCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, discount: null, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, stored: false, discount: null, callerFlagIgnored: true };
}

function applyCampaign(code, body = {}) {
  const normalized = String(code || "").trim();
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (!normalized) reasons.push("UNKNOWN");
  else reasons.push("COUPON_UNVERIFIED");
  if (body.mock === true || body.demo === true || body.source === "mock" || /MOCK|DEMO|TEST|FAKE/i.test(normalized)) {
    reasons.push("MOCK_COUPON");
  }
  return {
    ok: false,
    valid: false,
    error: reasons[0] || "COUPON_UNVERIFIED",
    code: reasons[0] || "COUPON_UNVERIFIED",
    status: reasons[0] === "SALES_CLOSED" ? 403 : 409,
    arithmeticOnly: false,
    discount: null,
    finalTotal: null,
    discountedSubtotal: null,
    taxBase: null,
    commercialTotal: null,
    couponStatus: normalized ? "BLOCKED" : "UNKNOWN",
    commercialApplied: false,
    applied: false,
    callerFlagIgnored: true,
    orderCreated: false,
    reasons,
  };
}

function useCampaign() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, used: false, orderCreated: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "COUPON_UNVERIFIED", code: "COUPON_UNVERIFIED", status: 409, stored: false, used: false, orderCreated: false, callerFlagIgnored: true };
}

function createLoyaltyAccount() {
  if (!isSalesEnabled()) {
    return { ok: false, error: "SALES_CLOSED", code: "SALES_CLOSED", status: 403, stored: false, accountCreated: false, callerFlagIgnored: true };
  }
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, accountCreated: false, callerFlagIgnored: true };
}

function adjustPoints() {
  if (!isSalesEnabled()) {
    return {
      ok: false,
      error: "SALES_CLOSED",
      code: "SALES_CLOSED",
      status: 403,
      stored: false,
      pointsApplied: false,
      balance: null,
      callerFlagIgnored: true,
    };
  }
  return {
    ok: false,
    error: "ORDER_UNVERIFIED",
    code: "ORDER_UNVERIFIED",
    status: 409,
    stored: false,
    pointsApplied: false,
    balance: null,
    callerFlagIgnored: true,
  };
}

function getLoyaltyProfile(customerId) {
  const account = db.prepare("SELECT * FROM mktloy_loyalty_accounts WHERE customer_id = ?").get(customerId);
  if (!account) return { error: "Loyalty account not found", status: 404 };

  return {
    account,
    tier: db.prepare("SELECT * FROM mktloy_loyalty_tiers WHERE id = ?").get(account.tier_id),
    ledger: db
      .prepare("SELECT * FROM mktloy_loyalty_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 100")
      .all(customerId),
  };
}

function referralRefusal(body = {}, referral = null, duplicate = false) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("PAYMENT_UNVERIFIED");
  reasons.push("REFERRAL_UNVERIFIED");
  const code = String(body.code || "").trim();
  if (!code) reasons.push("UNKNOWN");
  if (body.mock === true || body.demo === true || body.source === "mock" || body.source === "DEMO") {
    reasons.push("MOCK_REFERRAL");
  }
  const arithmeticReward = referral && Number.isFinite(Number(referral.reward_points)) ? Number(referral.reward_points) : null;
  return {
    ok: false,
    error: reasons[0] || "SALES_CLOSED",
    code: reasons[0] || "SALES_CLOSED",
    status: reasons[0] === "SALES_CLOSED" ? 403 : 409,
    referralStatus: code ? "BLOCKED" : "UNKNOWN",
    earned: false,
    completed: false,
    cancelled: false,
    reversed: false,
    rewardReversed: false,
    rewardPoints: null,
    arithmeticReward,
    arithmeticOnly: arithmeticReward != null,
    balance: null,
    balanceChanged: false,
    negativeBalance: false,
    ledgerWritten: false,
    accountCreated: false,
    couponIssued: false,
    discountApplied: false,
    orderCreated: false,
    paymentCreated: false,
    callerFlagIgnored: true,
    idempotent: true,
    duplicate: Boolean(duplicate),
    reasons,
  };
}

function referralIdentity(value, alias) {
  const primary = value == null ? "" : String(value).trim();
  if (primary) return primary;
  return alias == null ? "" : String(alias).trim();
}

function referralRequest(body, action) {
  const request = body && typeof body === "object" ? body : {};
  const referrerId = referralIdentity(request.referrerId, request.referrerCustomerId);
  const referredId = referralIdentity(request.referredId, request.referredCustomerId);
  const code = request.code == null ? "" : String(request.code).trim();
  return {
    referrerId,
    referredId,
    code,
    country: request.country,
    campaignCountry: request.campaignCountry,
    currency: request.currency,
    campaignCurrency: request.campaignCurrency,
    authoritySource: request.authoritySource,
    rewardAmount: typeof request.rewardAmount === "number" ? request.rewardAmount : undefined,
    conflictingReward: typeof request.conflictingReward === "number" ? request.conflictingReward : undefined,
    expiresAt: request.expiresAt,
    startsAt: request.startsAt,
    cancelled: request.cancelled === true,
    campaignStatus: request.campaignStatus,
    timeout: request.timeout === true,
    networkError: request.networkError === true,
    mock: request.mock === true,
    synthetic: request.synthetic === true,
    source: request.source,
    action: request.action,
    idempotencyKey: request.idempotencyKey || (
      action === "complete" && code
        ? `referral-complete:${code}`
        : `referral-${action}:${referrerId}:${referredId}:${code}`
    ),
  };
}

function referralDecision(body, action) {
  const request = body && typeof body === "object" ? body : {};
  const decision = assessReferral(referralRequest(request, action));
  return {
    ok: false,
    error: decision.code,
    code: decision.code,
    status: decision.status,
    referralStatus: decision.status,
    created: false,
    earned: false,
    completed: false,
    cancelled: false,
    reversed: false,
    rewardReversed: false,
    rewardCreated: false,
    rewardPoints: null,
    rewardAmount: null,
    arithmeticReward: null,
    arithmeticOnly: false,
    balance: null,
    balanceChanged: false,
    negativeBalance: false,
    ledgerWritten: false,
    accountCreated: false,
    couponIssued: false,
    discountApplied: false,
    orderCreated: false,
    paymentCreated: false,
    transferCreated: false,
    purchased: false,
    commercial: false,
    authorized: false,
    productionReady: false,
    callerFlagIgnored: true,
    callerAuthorizedIgnored: request.authorized === true || request.ok === true || request.status === 200,
    idempotent: true,
    duplicate: decision.duplicate === true,
    reasons: Array.isArray(decision.reasons) ? decision.reasons.slice() : [decision.code],
  };
}

function createReferral(body = {}) {
  return referralDecision(body, "create");
}

function completeReferral(body = {}) {
  return referralDecision(body, "complete");
}

function cancelReferral(body = {}) {
  return referralRefusal(body, body.code ? db.prepare("SELECT * FROM mktloy_referrals WHERE code = ?").get(String(body.code)) : null, false);
}

const preferenceWithdrawals = new Set();

function explicitTrue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function explicitFalse(value) {
  return value === false || value === 0 || value === "0" || value === "false";
}

function preferenceId(customerId) {
  const raw = String(customerId ?? "").trim();
  return /^[1-9]\d{0,17}$/.test(raw) ? raw : null;
}

function preferenceChannels(body = {}) {
  const all = body.withdraw === true || body.unsubscribe === true || body.revoked === true || explicitFalse(body.marketing) || explicitFalse(body.consent);
  const email = all || explicitFalse(body.emailOptIn) || explicitFalse(body.email_opt_in);
  const sms = all || explicitFalse(body.smsOptIn) || explicitFalse(body.sms_opt_in);
  const push = all || explicitFalse(body.pushOptIn) || explicitFalse(body.push_opt_in);
  const whatsapp = all || explicitFalse(body.whatsappOptIn) || explicitFalse(body.whatsapp);
  const grant = explicitTrue(body.consent) || explicitTrue(body.approved) || explicitTrue(body.verified) || explicitTrue(body.marketing) || explicitTrue(body.emailOptIn) || explicitTrue(body.email_opt_in) || explicitTrue(body.smsOptIn) || explicitTrue(body.sms_opt_in) || explicitTrue(body.pushOptIn) || explicitTrue(body.push_opt_in) || explicitTrue(body.whatsappOptIn) || explicitTrue(body.whatsapp);
  return { all, email, sms, push, whatsapp, any: email || sms || push || whatsapp, grant };
}

function grantChannels(body = {}) {
  const all = explicitTrue(body.marketing) || explicitTrue(body.consent) || explicitTrue(body.approved) || explicitTrue(body.verified);
  return {
    email: all || explicitTrue(body.emailOptIn) || explicitTrue(body.email_opt_in),
    sms: all || explicitTrue(body.smsOptIn) || explicitTrue(body.sms_opt_in),
    push: all || explicitTrue(body.pushOptIn) || explicitTrue(body.push_opt_in),
  };
}

function consentDecision(customerId, channel, body, action) {
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
    timeout: grant && body.timeout === true,
    networkError: grant && body.networkError === true,
    prechecked: grant && body.prechecked === true,
    defaultChecked: grant && body.defaultChecked === true,
    idempotencyKey: `${body.idempotencyKey || customerId}:${channel}:${action}`,
  });
}

function persistWithdrawnChannels(id, withdrawn, request) {
  const results = [];
  for (const channel of ["email", "sms", "push"]) {
    if (!withdrawn[channel]) continue;
    results.push(persistWithdrawal({
      customerId: String(id),
      channel,
      idempotencyKey: `${request.idempotencyKey || id}:${channel}:withdraw`,
      source: "loyalty-opt-out",
    }));
  }
  return results;
}

function preferenceResult(extra = {}) {
  return {
    ok: false,
    granted: false,
    consentVerified: false,
    consentSource: "UNKNOWN",
    consentScope: "UNKNOWN",
    consentAt: null,
    preferenceOnly: true,
    notificationSent: false,
    customerNotified: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    whatsappSent: false,
    campaignCreated: false,
    couponIssued: false,
    referralCreated: false,
    balanceChanged: false,
    orderCreated: false,
    callerFlagIgnored: true,
    ...extra,
  };
}

function updatePreferences(customerId, body = {}) {
  const id = preferenceId(customerId);
  const request = body || {};
  const channels = preferenceChannels(request);
  if (!id) {
    const decision = decideMarketingConsent({
      customerId: "",
      channel: "email",
      action: "grant",
      idempotencyKey: `missing:${String(customerId)}:email:grant`,
    });
    return preferenceResult({
      code: decision.code,
      gateCode: decision.code,
      gateStatus: decision.status,
      status: 400,
      marketingPermission: "UNKNOWN",
      emailPermission: decision.emailPermission,
      smsPermission: decision.smsPermission,
      pushPermission: decision.pushPermission,
      withdrawn: false,
      stored: false,
      persisted: false,
      granted: false,
      consentVerified: false,
      messageSent: false,
      reasons: decision.reasons || [decision.code],
    });
  }

  const withdrawn = { email: channels.email, sms: channels.sms, push: channels.push };
  const grants = grantChannels(request);
  const targetedGrant = {
    email: grants.email && !withdrawn.email,
    sms: grants.sms && !withdrawn.sms,
    push: grants.push && !withdrawn.push,
  };
  const anyWithdraw = withdrawn.email || withdrawn.sms || withdrawn.push;
  const anyGrant = targetedGrant.email || targetedGrant.sms || targetedGrant.push;
  if (!anyWithdraw && !anyGrant) {
    return preferenceResult({
      code: "CONSENT_UNVERIFIED",
      gateCode: "CONSENT_UNVERIFIED",
      gateStatus: "BLOCKED",
      status: 403,
      marketingPermission: "BLOCKED",
      withdrawn: false,
      stored: false,
      persisted: false,
      reasons: ["CONSENT_UNVERIFIED", "SALES_CLOSED"],
    });
  }

  const decisions = [];
  for (const channel of ["email", "sms", "push"]) {
    if (withdrawn[channel]) decisions.push(consentDecision(id, channel, request, "withdraw"));
  }
  for (const channel of ["email", "sms", "push"]) {
    if (targetedGrant[channel]) {
      const decision = consentDecision(id, channel, request, "grant");
      decisions.push(decision);
      persistGrant(decision);
    }
  }
  const snapshot = readMarketingConsent(String(id));
  const duplicateGate = decisions.some((decision) => decision.duplicate === true);
  const timedOut = decisions.some((decision) => decision.code === "TIMEOUT" || decision.code === "NETWORK_ERROR");
  const permissions = {
    emailPermission: snapshot.emailPermission,
    smsPermission: snapshot.smsPermission,
    pushPermission: snapshot.pushPermission,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    notificationSent: false,
    customerNotified: false,
    granted: false,
    consentVerified: false,
    campaignCreated: false,
    orderCreated: false,
  };

  if (anyWithdraw && !timedOut) {
    const results = persistWithdrawnChannels(id, withdrawn, request);
    const persisted = results.length > 0 && results.every((item) => item && item.persisted === true);
    const duplicate = preferenceWithdrawals.has(id) || duplicateGate || results.some((item) => item && item.duplicate === true);
    if (persisted) preferenceWithdrawals.add(id);
    const live = readMarketingConsent(String(id));
    return preferenceResult({
      ...permissions,
      emailPermission: live.emailPermission,
      smsPermission: live.smsPermission,
      pushPermission: live.pushPermission,
      code: persisted ? "CONSENT_WITHDRAWN" : "WITHDRAWN_NOT_PERSISTED",
      gateCode: duplicateGate ? "DUPLICATE_CONSENT" : "CONSENT_WITHDRAWN",
      gateStatus: "BLOCKED",
      status: persisted ? 200 : 403,
      marketingPermission: live.storeStatus === "UNAVAILABLE" ? "CLOSED" : "WITHDRAWN",
      withdrawn: true,
      stored: persisted,
      persisted,
      duplicate,
      idempotent: persisted,
      marketingSendsOpen: false,
      productionReady: false,
      reasons: ["CONSENT_WITHDRAWN", "SALES_CLOSED"],
    });
  }

  const unknown = decisions.find((decision) => decision.status === "UNKNOWN");
  const failed = decisions.find((decision) => decision.code === "TIMEOUT" || decision.code === "NETWORK_ERROR");
  const primary = failed || unknown || decisions[decisions.length - 1];
  return preferenceResult({
    ...permissions,
    code: primary.code,
    gateCode: primary.code,
    gateStatus: primary.status,
    status: primary.status === "UNKNOWN" ? 400 : 403,
    marketingPermission: primary.status === "UNKNOWN" ? "UNKNOWN" : "BLOCKED",
    withdrawn: false,
    stored: false,
    persisted: false,
    marketingSendsOpen: false,
    productionReady: false,
    duplicate: duplicateGate,
    reasons: primary.reasons || [primary.code, "SALES_CLOSED"],
  });
}

function getPreferences(customerId) {
  const id = preferenceId(customerId);
  if (!id) {
    return preferenceResult({ code: "UNKNOWN", marketingPermission: "UNKNOWN", stored: false, persisted: false, marketingSendsOpen: false });
  }
  const consent = readMarketingConsent(String(id));
  if (consent.storeStatus === "UNAVAILABLE") {
    return preferenceResult({
      code: "CONSENT_STORE_UNAVAILABLE",
      marketingPermission: "CLOSED",
      emailPermission: "CLOSED",
      smsPermission: "CLOSED",
      pushPermission: "CLOSED",
      stored: false,
      persisted: false,
      granted: false,
      marketingSendsOpen: false,
    });
  }
  const values = [consent.emailPermission, consent.smsPermission, consent.pushPermission];
  const durable = values.some((item) => item === "WITHDRAWN" || item === "GRANTED");
  return preferenceResult({
    code: consent.storeStatus === "READY" && durable ? "WITHDRAWN" : "UNKNOWN",
    marketingPermission: values.includes("WITHDRAWN") ? "WITHDRAWN" : "UNKNOWN",
    emailPermission: consent.emailPermission,
    smsPermission: consent.smsPermission,
    pushPermission: consent.pushPermission,
    stored: consent.storeStatus === "READY" && durable,
    persisted: consent.storeStatus === "READY" && durable,
    granted: false,
    marketingSendsOpen: false,
  });
}

function getMarketingLoyaltyOverview() {
  return {
    campaigns: db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns").get().n,
    activeCampaigns: db.prepare("SELECT COUNT(*) n FROM mktloy_campaigns WHERE status = 'active'").get().n,
    promotionUses: db.prepare("SELECT COUNT(*) n FROM mktloy_promotion_uses").get().n,
    loyaltyCustomers: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n,
    loyaltyPoints: db.prepare("SELECT COALESCE(SUM(points_balance), 0) n FROM mktloy_loyalty_accounts").get().n,
    referrals: db.prepare("SELECT COUNT(*) n FROM mktloy_referrals").get().n,
    completedReferrals: db
      .prepare("SELECT COUNT(*) n FROM mktloy_referrals WHERE status = 'completed'")
      .get().n,
  };
}

function getMarketingLoyaltyStatus() {
  const overview = getMarketingLoyaltyOverview();
  return {
    version: "2.6.0",
    enabled: isEnabled(),
    totals: {
      campaigns: overview.campaigns,
      activeCampaigns: overview.activeCampaigns,
      promotionUses: overview.promotionUses,
      loyaltyCustomers: overview.loyaltyCustomers,
      loyaltyPoints: overview.loyaltyPoints,
      referrals: overview.referrals,
      completedReferrals: overview.completedReferrals,
      tiers: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_tiers").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  seedTiers,
  createCampaign,
  listCampaigns,
  updateCampaign,
  applyCampaign,
  useCampaign,
  createLoyaltyAccount,
  adjustPoints,
  getLoyaltyProfile,
  createReferral,
  completeReferral,
  cancelReferral,
  updatePreferences,
  getPreferences,
  getMarketingLoyaltyOverview,
  getMarketingLoyaltyStatus,
};
