const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, publicUser } = require("./customerAuth");

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
  if (!customer || customer.password_hash !== hashPassword(password)) return null;
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
  const allowed = ["firstName", "lastName", "phone", "country"];
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

function listAddresses(customerId) {
  return findById(customerId)?.addresses || [];
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
  return next;
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

function updatePreferences(customerId, preferences) {
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  customers[idx].preferences = { ...customers[idx].preferences, ...preferences };
  writeCustomers(customers);
  return customers[idx].preferences;
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
  listAddresses,
  upsertAddress,
  deleteAddress,
  getWishlist,
  setWishlist,
  toggleWishlist,
  updatePreferences,
  requestDeletion,
};
