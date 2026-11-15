/**
 * Local referral reward gate.
 * A referral check is not a payment, an order, a balance credit, or a transfer.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const decisions = new Map();
const invited = new Set();
const CODE_SHAPE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    earned: false,
    completed: false,
    rewardCreated: false,
    rewardAmount: null,
    rewardPoints: null,
    balance: null,
    balanceChanged: false,
    transferCreated: false,
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
    authorized: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    selectedReward: null,
    ...extra,
  };
}

function statusFor(code) {
  if (code === "TIMEOUT" || code === "NETWORK_ERROR") return "FAILED";
  if (
    code === "REFERRER_UNKNOWN" ||
    code === "REFERRED_UNKNOWN" ||
    code === "REFERRAL_CODE_UNKNOWN" ||
    code === "REWARD_UNKNOWN" ||
    code === "CAMPAIGN_SOURCE_UNKNOWN" ||
    code === "REWARD_UNVERIFIED"
  ) {
    return "UNKNOWN";
  }
  return "BLOCKED";
}

function assessReferral(input = {}) {
  const referrerId = input.referrerId ? String(input.referrerId) : "";
  const referredId = input.referredId ? String(input.referredId) : "";
  const rawCode = input.code == null ? "" : String(input.code).trim().toUpperCase();
  const key = input.idempotencyKey || `${referrerId}:${referredId}:${rawCode}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    return closed("DUPLICATE_REWARD", prior.status, {
      ...prior,
      code: "DUPLICATE_REWARD",
      duplicate: true,
      earned: false,
      rewardCreated: false,
      rewardAmount: null,
      paymentCreated: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const country = countryCode(input.country);
  const campaignCountry = countryCode(input.campaignCountry);
  const cartCurrency = String(input.currency || "").trim().toUpperCase();
  const campaignCurrency = String(input.campaignCurrency || "").trim().toUpperCase();
  const source = input.authoritySource ? String(input.authoritySource) : "";
  let code = "REWARD_UNVERIFIED";

  if (input.timeout === true) code = "TIMEOUT";
  else if (input.networkError === true) code = "NETWORK_ERROR";
  else if (input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") code = "MOCK_NOT_REWARD";
  else if (!referrerId) code = "REFERRER_UNKNOWN";
  else if (!referredId) code = "REFERRED_UNKNOWN";
  else if (referrerId === referredId) code = "SELF_REFERRAL";
  else if (invited.has(referredId)) code = "DUPLICATE_REFERRAL";
  else if (!CODE_SHAPE.test(rawCode)) code = "REFERRAL_CODE_INVALID";
  else if (input.cancelled === true || input.campaignStatus === "cancelled") code = "CAMPAIGN_CANCELLED";
  else if (Number.isFinite(Date.parse(String(input.expiresAt || ""))) && Date.parse(String(input.expiresAt)) <= Date.now()) code = "CAMPAIGN_EXPIRED";
  else if (Number.isFinite(Date.parse(String(input.startsAt || ""))) && Date.parse(String(input.startsAt)) > Date.now()) code = "CAMPAIGN_NOT_STARTED";
  else if (!country || !campaignCountry) code = "COUNTRY_SCOPE_UNKNOWN";
  else if (country !== campaignCountry) code = "COUNTRY_SCOPE_MISMATCH";
  else if (!/^[A-Z]{3}$/.test(cartCurrency) || !/^[A-Z]{3}$/.test(campaignCurrency)) code = "CURRENCY_SCOPE_UNKNOWN";
  else if (cartCurrency !== campaignCurrency) code = "CURRENCY_SCOPE_MISMATCH";
  else if (typeof input.conflictingReward === "number" && typeof input.rewardAmount === "number" && input.conflictingReward !== input.rewardAmount) code = "REFERRAL_CONFLICT";
  else if (typeof input.rewardAmount !== "number" || !Number.isFinite(input.rewardAmount)) code = "REWARD_UNKNOWN";
  else if (!source || source === "unknown") code = "REFERRAL_CODE_UNKNOWN";
  else code = "REWARD_UNVERIFIED";

  reasons.push(code);
  if (!isSalesEnabled() && code !== "SALES_CLOSED") reasons.unshift("SALES_CLOSED");
  const result = closed(code, statusFor(code), {
    reasons,
    referrerId: referrerId || null,
    referredId: referredId && referrerId !== referredId ? referredId : null,
    normalizedCode: CODE_SHAPE.test(rawCode) ? rawCode : null,
    country,
    campaignCountry,
    currency: null,
    authorized: false,
  });
  decisions.set(key, result);
  if (code === "REWARD_UNVERIFIED" && referredId) invited.add(referredId);
  return result;
}

function resetReferralMemory() {
  decisions.clear();
  invited.clear();
}

function retryReferral(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    earned: false,
    rewardCreated: false,
    rewardAmount: null,
    balanceChanged: false,
    transferCreated: false,
    orderCreated: false,
    paymentCreated: false,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

module.exports = {
  assessReferral,
  retryReferral,
  resetReferralMemory,
};
