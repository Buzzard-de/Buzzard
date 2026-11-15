const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword: verifyPasswordHash } = require("./password");
const { publicUser } = require("./customerAuth");
const { decideMarketingConsent, persistWithdrawal, persistGrant, projectMarketingConsent } = require("./commerce/marketingConsentGate");

const dataDir = path.join(__dirname, "..", "data");
const customersFile = path.join(dataDir, "customers.json");
const seedFile = path.join(__dirname, "..", "..", "data", "buzzard_account_users.seed.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readCustomers() {
  ensureDataDir();
  if (!fs.existsSync(customersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(customersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeCustomers(customers) {
  ensureDataDir();
  fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2), "utf8");
}

function seedCustomers() {
  if (fs.existsSync(customersFile)) return;
  if (!fs.existsSync(seedFile)) return;
  const seed = JSON.parse(fs.readFileSync(seedFile, "utf8"));
  const customers = seed.map((entry) => ({
    id: entry.id || `cust-${crypto.randomUUID()}`,
    email: entry.email.toLowerCase(),
    password_hash: hashPassword(entry.password),
    firstName: entry.firstName,
    lastName: entry.lastName,
    country: entry.country || "DE",
    phone: entry.phone || "",
    emailVerified: entry.emailVerified ?? true,
    createdAt: new Date().toISOString(),
    preferences: {
      language: "de",
      marketing: false,
      transactional: true,
    },
    addresses: [],
    wishlist: [],
    deletionRequestedAt: null,
  }));
  writeCustomers(customers);
}

seedCustomers();

function findByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  return readCustomers().find((c) => c.email === normalized);
}

function findById(id) {
  return readCustomers().find((c) => c.id === id);
}

function verifyPassword(email, password) {
  const customer = findByEmail(email);
  if (!customer || !verifyPasswordHash(password, customer.password_hash)) return null;
  return customer;
}

function register(payload) {
  if (findByEmail(payload.email)) return { success: false, errorKey: "account.register.emailExists" };

  const customer = {
    id: `cust-${crypto.randomUUID()}`,
    email: payload.email.trim().toLowerCase(),
    password_hash: hashPassword(payload.password),
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    country: payload.country || "DE",
    phone: payload.phone || "",
    emailVerified: false,
    createdAt: new Date().toISOString(),
    preferences: {
      language: payload.language || "de",
      transactional: true,
    },
    addresses: [],
    wishlist: [],
    deletionRequestedAt: null,
  };

  const customers = readCustomers();
  customers.push(customer);
  writeCustomers(customers);
  return { success: true, customer };
}

function updateProfile(customerId, patch) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  const allowed = ["firstName", "lastName", "country"];
  for (const key of allowed) {
    if (patch[key] !== undefined) customers[idx][key] = patch[key];
  }
  writeCustomers(customers);
  return customers[idx];
}

function updatePassword(customerId, newPassword) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return false;
  customers[idx].password_hash = hashPassword(newPassword);
  writeCustomers(customers);
  return true;
}

function updatePasswordHash(customerId, newPassword) {
  return updatePassword(customerId, newPassword);
}

function exportCustomerData() {
  return { ok: false, exported: false, code: "EXPORT_BLOCKED", customer: null, email: null, phone: null, addresses: [] };
}

function listAddresses(customerId) {
  return (findById(customerId)?.addresses || []).map((address) => ({
    id: address.id,
    city: address.city || null,
    countryCode: address.countryCode || address.country || null,
    phone: null,
    line1: null,
    shippingVerified: false,
    delivered: false,
  }));
}

function upsertAddress(customerId, address) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;

  const addresses = customers[idx].addresses || [];
  const now = new Date().toISOString();
  let next;

  if (address.id) {
    const aIdx = addresses.findIndex((a) => a.id === address.id);
    if (aIdx < 0) return null;
    next = { ...addresses[aIdx], ...address, updatedAt: now };
    addresses[aIdx] = next;
  } else {
    next = {
      id: `addr-${crypto.randomUUID()}`,
      ...address,
      createdAt: now,
      updatedAt: now,
    };
    addresses.push(next);
  }

  if (address.isDefaultShipping) {
    addresses.forEach((a) => {
      a.isDefaultShipping = a.id === next.id;
    });
  }
  if (address.isDefaultBilling) {
    addresses.forEach((a) => {
      a.isDefaultBilling = a.id === next.id;
    });
  }

  customers[idx].addresses = addresses;
  writeCustomers(customers);
  return { id: next.id, phone: null, line1: null, shippingVerified: false, delivered: false, customerNotified: false };
}

function deleteAddress(customerId, addressId) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return false;
  customers[idx].addresses = (customers[idx].addresses || []).filter((a) => a.id !== addressId);
  writeCustomers(customers);
  return true;
}

function getWishlist(customerId) {
  return findById(customerId)?.wishlist || [];
}

function setWishlist(customerId, productIds) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  customers[idx].wishlist = [...new Set(productIds)];
  writeCustomers(customers);
  return customers[idx].wishlist;
}

function toggleWishlist(customerId, productId) {
  const current = getWishlist(customerId);
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  return setWishlist(customerId, next);
}

function explicitFalse(value) {
  return value === false || value === 0 || value === "0" || value === "false";
}

function explicitTrue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function consentIntents(body = {}) {
  const blanketGrant = explicitTrue(body.ok)
    || explicitTrue(body.authorized)
    || explicitTrue(body.granted)
    || body.status === 200
    || explicitTrue(body.consent)
    || explicitTrue(body.approved)
    || explicitTrue(body.verified)
    || explicitTrue(body.marketing)
    || explicitTrue(body.marketingConsent);
  const blanketWithdraw = body.withdraw === true || body.unsubscribe === true || body.revoked === true;
  const spec = {
    email: {
      grant: explicitTrue(body.emailOptIn) || explicitTrue(body.email_opt_in),
      withdraw: explicitFalse(body.emailOptIn) || explicitFalse(body.email_opt_in),
    },
    sms: {
      grant: explicitTrue(body.smsOptIn) || explicitTrue(body.sms_opt_in),
      withdraw: explicitFalse(body.smsOptIn) || explicitFalse(body.sms_opt_in),
    },
    push: {
      grant: explicitTrue(body.pushOptIn) || explicitTrue(body.push_opt_in),
      withdraw: explicitFalse(body.pushOptIn) || explicitFalse(body.push_opt_in),
    },
  };
  const intents = { blanketWithdraw };
  for (const channel of ["email", "sms", "push"]) {
    const withdraw = blanketWithdraw || spec[channel].withdraw;
    intents[channel] = { grant: !withdraw && (blanketGrant || spec[channel].grant), withdraw };
  }
  return intents;
}

function consentDecision(customerId, channel, body, action) {
  const grant = action === "grant";
  return decideMarketingConsent({
    customerId: customerId == null ? "" : String(customerId),
    channel,
    action,
    withdraw: !grant,
    consent: grant,
    source: grant ? (body.consentSource || body.source || "") : (body.consentSource || body.source || "customer-opt-out"),
    scope: grant ? (body.consentScope || body.scope || "") : (body.consentScope || body.scope || `marketing-${channel}`),
    consentedAt: grant ? (body.consentAt || body.consentedAt || "") : (body.consentAt || body.consentedAt || "2026-11-15T00:00:00.000Z"),
    timeout: body.timeout === true,
    networkError: body.networkError === true,
    idempotencyKey: `${body.idempotencyKey || customerId}:${channel}:${action}`,
  });
}

const MARKETING_KEYS = new Set([
  "marketing",
  "marketingConsent",
  "consent",
  "approved",
  "verified",
  "granted",
  "emailOptIn",
  "email_opt_in",
  "smsOptIn",
  "sms_opt_in",
  "pushOptIn",
  "push_opt_in",
  "whatsappOptIn",
  "whatsapp",
  "marketingPermission",
  "emailPermission",
  "smsPermission",
  "pushPermission",
  "whatsappPermission",
]);

function profilePreferences(current = {}, language) {
  const next = {};
  const chosen = language != null ? language : current.language;
  if (chosen != null && String(chosen).trim() !== "") next.language = String(chosen).trim();
  if (current.transactional !== undefined) next.transactional = current.transactional !== false;
  return next;
}

function accountConsentView(customer) {
  const consent = projectMarketingConsent(customer && customer.id);
  return {
    granted: false,
    consentVerified: false,
    marketingPermission: consent.marketingPermission,
    emailPermission: consent.emailPermission,
    smsPermission: consent.smsPermission,
    pushPermission: consent.pushPermission,
    whatsappPermission: consent.whatsappPermission,
    marketingSendsOpen: false,
    productionReady: false,
    notificationSent: false,
    preferences: {
      ...profilePreferences(customer && customer.preferences),
      emailPermission: consent.emailPermission,
      smsPermission: consent.smsPermission,
      pushPermission: consent.pushPermission,
      whatsappPermission: consent.whatsappPermission,
      granted: false,
      consentVerified: false,
    },
  };
}

function applyPreferencePatch(current = {}, body = {}) {
  const next = profilePreferences(current);
  let stored = false;
  let withdrawn = false;
  for (const [key, value] of Object.entries(body || {})) {
    if (key === "email" || key === "phone" || key === "password" || key === "name") continue;
    if (MARKETING_KEYS.has(key)) {
      if (explicitFalse(value)) withdrawn = true;
      continue;
    }
    if (key === "withdraw" || key === "unsubscribe" || key === "revoked") {
      if (value === true) withdrawn = true;
      continue;
    }
    if (key === "language") {
      next.language = String(value ?? "").trim();
      stored = true;
      continue;
    }
    if (key === "transactional") {
      next.transactional = value !== false;
      stored = true;
    }
  }
  if (body.withdraw === true || body.unsubscribe === true || body.revoked === true) withdrawn = true;
  return {
    preferences: next,
    stored,
    withdrawn,
    granted: false,
    marketingPermission: withdrawn ? "WITHDRAWN" : "BLOCKED",
    consentVerified: false,
    notificationSent: false,
    customerNotified: false,
  };
}

function preferenceLanguage(body) {
  if (!Object.prototype.hasOwnProperty.call(body, "language")) return null;
  return String(body.language ?? "").trim();
}

function updatePreferences(customerId, preferences) {
  const body = preferences && typeof preferences === "object" ? preferences : {};
  const intents = consentIntents(body);
  const language = preferenceLanguage(body);
  const hasConsent = ["email", "sms", "push"].some((channel) => intents[channel].grant || intents[channel].withdraw);
  const decisions = [];
  if (hasConsent) {
    for (const channel of ["email", "sms", "push"]) {
      if (intents[channel].withdraw) decisions.push(consentDecision(customerId, channel, body, "withdraw"));
      else if (intents[channel].grant) {
        const decision = consentDecision(customerId, channel, body, "grant");
        decisions.push(decision);
        persistGrant(decision);
      }
    }
  }
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  const current = customers[idx].preferences || {};
  const failedClosed = decisions.some((decision) => decision.code === "TIMEOUT" || decision.code === "NETWORK_ERROR" || decision.status === "FAILED");
  const withdrawals = decisions.filter((decision) => intents[decision.channel]?.withdraw === true && (decision.code === "CONSENT_WITHDRAWN" || decision.code === "DUPLICATE_CONSENT"));
  const languageStored = language != null && language !== String(current.language || "");
  const storedPrefs = profilePreferences(current, languageStored ? language : undefined);
  const durable = [];
  if (!failedClosed) {
    for (const decision of withdrawals) {
      durable.push(persistWithdrawal({
        customerId,
        channel: decision.channel,
        idempotencyKey: `${body.idempotencyKey || customerId}:${decision.channel}:withdraw`,
        source: "customer-opt-out",
      }));
    }
  }
  const persisted = durable.length > 0 && durable.every((item) => item && item.persisted === true);
  const consentFailed = failedClosed || (withdrawals.length > 0 && !persisted);
  if (languageStored || persisted) {
    customers[idx].preferences = storedPrefs;
    writeCustomers(customers);
  }
  const view = accountConsentView({ id: customerId, preferences: languageStored || persisted ? storedPrefs : profilePreferences(current) });
  return {
    ...view,
    stored: consentFailed ? false : persisted || languageStored,
    persisted,
    withdrawn: persisted,
    languageStored,
    callerFlagIgnored: true,
    granted: false,
    consentVerified: false,
  };
}

function requestDeletion(customerId) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  customers[idx].deletionRequestedAt = new Date().toISOString();
  writeCustomers(customers);
  return customers[idx].deletionRequestedAt;
}

module.exports = {
  publicUser,
  findByEmail,
  findById,
  verifyPassword,
  register,
  updateProfile,
  updatePassword,
  updatePasswordHash,
  exportCustomerData,
  listAddresses,
  upsertAddress,
  deleteAddress,
  getWishlist,
  setWishlist,
  toggleWishlist,
  applyPreferencePatch,
  accountConsentView,
  updatePreferences,
  requestDeletion,
};
