/**
 * Local campaign authority.
 * A campaign check is not a discount, an order, a payment, or a message.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const decisions = new Map();

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    authorized: false,
    verified: false,
    approved: false,
    active: false,
    discount: null,
    discountAmount: null,
    total: null,
    commercialTotal: null,
    budget: null,
    spend: null,
    published: false,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    messageSent: false,
    purchased: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    selectedAuthority: null,
    ...extra,
  };
}

function statusFor(code) {
  if (
    code === "TIMEOUT"
    || code === "NETWORK_ERROR"
    || code === "CAMPAIGN_SOURCE_UNKNOWN"
    || code === "CAMPAIGN_OWNER_UNKNOWN"
    || code === "CAMPAIGN_WINDOW_UNKNOWN"
    || code === "COUNTRY_SCOPE_UNKNOWN"
    || code === "CURRENCY_SCOPE_UNKNOWN"
    || code === "PRODUCT_SCOPE_UNKNOWN"
    || code === "CATEGORY_SCOPE_UNKNOWN"
    || code === "CAMPAIGN_OWNER_UNVERIFIED"
  ) return "UNKNOWN";
  return "BLOCKED";
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function decideCampaignAuthority(input = {}) {
  const campaignId = text(input.campaignId);
  const sourceRecordId = text(input.sourceRecordId);
  const source = text(input.authoritySource);
  const ownerId = text(input.ownerId);
  const country = countryCode(input.country);
  const campaignCountry = countryCode(input.campaignCountry);
  const key = input.idempotencyKey || `${campaignId}:${sourceRecordId}:${country || ""}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    return closed("DUPLICATE_CAMPAIGN", prior.status, {
      ...prior,
      code: "DUPLICATE_CAMPAIGN",
      duplicate: true,
      authorized: false,
      verified: false,
      approved: false,
      active: false,
      discount: null,
      discountAmount: null,
      total: null,
      commercialTotal: null,
      orderCreated: false,
      paymentCreated: false,
      reservationCreated: false,
      messageSent: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const synthetic = input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO" || source === "mock" || source === "DEMO";
  const sourceCampaignId = text(input.sourceCampaignId);
  const conflictingAuthority = text(input.conflictingAuthority);
  const conflictingRecordId = text(input.conflictingRecordId);
  const recordOwnerId = text(input.recordOwnerId);
  const conflict = (sourceCampaignId && sourceCampaignId !== campaignId)
    || (conflictingAuthority && conflictingAuthority !== source)
    || (conflictingRecordId && conflictingRecordId !== sourceRecordId)
    || (recordOwnerId && ownerId && recordOwnerId !== ownerId);
  const campaignStatus = text(input.campaignStatus).toLowerCase();
  const starts = Date.parse(text(input.startsAt));
  const ends = Date.parse(text(input.endsAt));
  const now = Date.now();
  const requestedCurrency = text(input.currency).toUpperCase();
  const campaignCurrency = text(input.campaignCurrency).toUpperCase();
  const productId = text(input.productId);
  const campaignProductId = text(input.campaignProductId);
  const category = text(input.category);
  const campaignCategory = text(input.campaignCategory);

  let code = "CAMPAIGN_OWNER_UNVERIFIED";
  if (input.timeout === true || input.forceTimeout === true) code = "TIMEOUT";
  else if (input.networkError === true) code = "NETWORK_ERROR";
  else if (synthetic) code = "MOCK_NOT_CAMPAIGN";
  else if (!campaignId || !sourceRecordId || !source || source === "unknown") code = "CAMPAIGN_SOURCE_UNKNOWN";
  else if (!ownerId || ownerId === "unknown") code = "CAMPAIGN_OWNER_UNKNOWN";
  else if (conflict) code = "CAMPAIGN_AUTHORITY_CONFLICT";
  else if (campaignStatus === "cancelled" || input.cancelled === true) code = "CAMPAIGN_CANCELLED";
  else if (campaignStatus === "expired") code = "CAMPAIGN_EXPIRED";
  else if (!Number.isFinite(starts) || !Number.isFinite(ends)) code = "CAMPAIGN_WINDOW_UNKNOWN";
  else if (starts > now) code = "CAMPAIGN_NOT_STARTED";
  else if (ends <= now) code = "CAMPAIGN_EXPIRED";
  else if (!country || !campaignCountry) code = "COUNTRY_SCOPE_UNKNOWN";
  else if (country !== campaignCountry) code = "COUNTRY_SCOPE_MISMATCH";
  else if (!/^[A-Z]{3}$/.test(requestedCurrency) || !/^[A-Z]{3}$/.test(campaignCurrency)) code = "CURRENCY_SCOPE_UNKNOWN";
  else if (requestedCurrency !== campaignCurrency) code = "CURRENCY_SCOPE_MISMATCH";
  else if (!productId || !campaignProductId) code = "PRODUCT_SCOPE_UNKNOWN";
  else if (productId !== campaignProductId) code = "PRODUCT_SCOPE_MISMATCH";
  else if (!category || !campaignCategory) code = "CATEGORY_SCOPE_UNKNOWN";
  else if (category !== campaignCategory) code = "CATEGORY_SCOPE_MISMATCH";

  reasons.push(code);
  const result = closed(code, statusFor(code), {
    reasons,
    campaignId: campaignId || null,
    sourceRecordId: sourceRecordId || null,
    ownerId: ownerId && ownerId !== "unknown" ? ownerId : null,
    authoritySource: source && source !== "unknown" && source !== "mock" && source !== "DEMO" ? source : null,
    country,
    campaignCountry,
    currency: null,
    productId: productId && productId === campaignProductId ? productId : null,
    category: category && category === campaignCategory ? category : null,
  });
  decisions.set(key, result);
  return result;
}

function retryCampaignAuthority(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const retryable = prior.code === "TIMEOUT" || prior.code === "NETWORK_ERROR";
  const next = closed(retryable ? prior.code : "RETRY_NOT_APPLIED", prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: retryable ? prior.code : "RETRY_NOT_APPLIED",
    status: prior.status,
    authorized: false,
    verified: false,
    approved: false,
    active: false,
    discount: null,
    discountAmount: null,
    total: null,
    commercialTotal: null,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    messageSent: false,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

module.exports = {
  decideCampaignAuthority,
  retryCampaignAuthority,
};
