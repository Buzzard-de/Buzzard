const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword: verifyPasswordHash } = require("./password");
const { publicUser } = require("./customerAuth");

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
      marketing: Boolean(payload.marketing),
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

function applyPreferencePatch(current = {}, body = {}) {
  const next = { ...current };
  const marketingKeys = new Set([
    "marketing",
    "marketingConsent",
    "consent",
    "approved",
    "verified",
    "emailOptIn",
    "email_opt_in",
    "smsOptIn",
    "sms_opt_in",
    "pushOptIn",
    "push_opt_in",
    "whatsappOptIn",
    "whatsapp",
  ]);
  let stored = false;
  let withdrawn = false;
  for (const [key, value] of Object.entries(body || {})) {
    if (key === "email" || key === "phone" || key === "password" || key === "name") continue;
    if (marketingKeys.has(key)) {
      if (explicitFalse(value)) {
        next[key] = false;
        stored = true;
        withdrawn = true;
      }
      continue;
    }
    next[key] = value;
    stored = true;
  }
  if (body.withdraw === true || body.unsubscribe === true || body.revoked === true) {
    for (const key of marketingKeys) next[key] = false;
    stored = true;
    withdrawn = true;
  }
  next.marketingPermission = withdrawn ? "WITHDRAWN" : "BLOCKED";
  next.consentVerified = false;
  next.consentSource = "UNKNOWN";
  next.granted = false;
  return {
    preferences: next,
    stored,
    withdrawn,
    granted: false,
    marketingPermission: next.marketingPermission,
    consentVerified: false,
    notificationSent: false,
    customerNotified: false,
  };
}

function updatePreferences(customerId, preferences) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  const patch = applyPreferencePatch(customers[idx].preferences || {}, preferences || {});
  customers[idx].preferences = patch.preferences;
  if (patch.stored) writeCustomers(customers);
  return patch;
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
  updatePreferences,
  requestDeletion,
};
