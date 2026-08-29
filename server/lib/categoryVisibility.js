const fs = require("fs");
const path = require("path");
const { CATEGORY_VISIBILITY, READINESS_STATUS } = require("../core/constants");

const dataDir = path.join(__dirname, "..", "..", "data");
const visibilityFile = path.join(dataDir, "buzzard_category_visibility.json");

const CUSTOMER_VISIBLE = new Set([
  CATEGORY_VISIBILITY.ACTIVE,
  CATEGORY_VISIBILITY.COMING_SOON,
]);

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readStore() {
  ensureDataDir();
  if (!fs.existsSync(visibilityFile)) {
    return { version: "1.0.0", categories: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(visibilityFile, "utf8"));
  } catch {
    return { version: "1.0.0", categories: {} };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(visibilityFile, JSON.stringify(store, null, 2), "utf8");
}

function defaultReadiness() {
  return {
    products: READINESS_STATUS.NOT_READY,
    pricing: READINESS_STATUS.NOT_READY,
    stock: READINESS_STATUS.NOT_READY,
    supplier: READINESS_STATUS.NOT_READY,
    shipping: READINESS_STATUS.NOT_READY,
    payment: READINESS_STATUS.BLOCKED,
    logistics: READINESS_STATUS.NOT_READY,
    frontend: READINESS_STATUS.READY,
    legal: READINESS_STATUS.NOT_READY,
    content: READINESS_STATUS.NOT_READY,
    overall: READINESS_STATUS.NOT_READY,
  };
}

function computeOverallReadiness(readiness, visibilityStatus) {
  if (visibilityStatus === CATEGORY_VISIBILITY.DRAFT) return READINESS_STATUS.DRAFT;
  const r = { ...defaultReadiness(), ...readiness };
  const checks = ["products", "pricing", "stock", "supplier", "shipping", "frontend", "legal", "content"];
  if (checks.some((k) => r[k] === READINESS_STATUS.BLOCKED)) return READINESS_STATUS.BLOCKED;
  if (process.env.BUZZARD_SALES_ENABLED !== "1") {
    if (r.payment !== READINESS_STATUS.BLOCKED) r.payment = READINESS_STATUS.BLOCKED;
  }
  if (checks.every((k) => r[k] === READINESS_STATUS.READY)) return READINESS_STATUS.READY;
  return READINESS_STATUS.NOT_READY;
}

function getReadinessBlockers(readiness, visibilityStatus) {
  const r = { ...defaultReadiness(), ...readiness };
  const overall = computeOverallReadiness(r, visibilityStatus);
  const blockers = Object.entries(r)
    .filter(([key, val]) => key !== "overall" && val !== READINESS_STATUS.READY)
    .map(([key, val]) => ({ check: key, status: val }));
  return { overall, blockers };
}

function canActivateForSale(readiness, visibilityStatus) {
  const { overall } = getReadinessBlockers(readiness, visibilityStatus);
  if (process.env.BUZZARD_SALES_ENABLED === "1") {
    return overall === READINESS_STATUS.READY;
  }
  return overall === READINESS_STATUS.READY && visibilityStatus === CATEGORY_VISIBILITY.ACTIVE;
}

function getCategoryStatus(categoryId) {
  const store = readStore();
  const entry = store.categories[categoryId];
  if (!entry) {
    return {
      status: CATEGORY_VISIBILITY.ACTIVE,
      readiness: defaultReadiness(),
    };
  }
  return {
    status: entry.status || CATEGORY_VISIBILITY.ACTIVE,
    readiness: { ...defaultReadiness(), ...(entry.readiness || {}) },
    updatedBy: entry.updatedBy || null,
    updatedAt: entry.updatedAt || null,
  };
}

function setCategoryStatus(categoryId, status, { updatedBy, readiness } = {}) {
  const allowed = Object.values(CATEGORY_VISIBILITY);
  if (!allowed.includes(status)) {
    throw new Error(`Invalid category status: ${status}`);
  }
  const store = readStore();
  const prev = store.categories[categoryId] || {};
  store.categories[categoryId] = {
    status,
    readiness: {
      ...defaultReadiness(),
      ...(readiness || prev.readiness || {}),
      overall: computeOverallReadiness(
        { ...defaultReadiness(), ...(readiness || prev.readiness || {}) },
        status
      ),
    },
    updatedBy: updatedBy || null,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.categories[categoryId];
}

function listAllStatuses() {
  return readStore().categories;
}

function isVisibleToCustomer(status) {
  return CUSTOMER_VISIBLE.has(status || CATEGORY_VISIBILITY.ACTIVE);
}

function syncFromDb(db) {
  if (!db) return;
  try {
    const rows = db.prepare("SELECT category_id, status, readiness_json, updated_by, updated_at FROM core_category_visibility").all();
    const store = readStore();
    for (const row of rows) {
      store.categories[row.category_id] = {
        status: row.status,
        readiness: row.readiness_json ? JSON.parse(row.readiness_json) : defaultReadiness(),
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
      };
    }
    writeStore(store);
  } catch {
    /* table may not exist yet */
  }
}

function persistToDb(db, categoryId, entry) {
  if (!db) return;
  db.prepare(`
    INSERT INTO core_category_visibility(category_id, status, readiness_json, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(category_id) DO UPDATE SET
      status = excluded.status,
      readiness_json = excluded.readiness_json,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(
    categoryId,
    entry.status,
    JSON.stringify(entry.readiness || defaultReadiness()),
    entry.updatedBy || null,
    entry.updatedAt || new Date().toISOString()
  );
}

module.exports = {
  CATEGORY_VISIBILITY,
  READINESS_STATUS,
  getCategoryStatus,
  setCategoryStatus,
  listAllStatuses,
  isVisibleToCustomer,
  defaultReadiness,
  computeOverallReadiness,
  getReadinessBlockers,
  canActivateForSale,
  syncFromDb,
  persistToDb,
  readStore,
};
