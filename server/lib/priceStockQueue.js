/** Price/stock queue + audit (P1-07). Catalog mode — no sales activation. */

const fs = require("fs");
const path = require("path");

const queueFile = path.join(__dirname, "..", "data", "price-stock-queue.json");
const auditFile = path.join(__dirname, "..", "data", "price-stock-audit.json");

const LARGE_CHANGE_PERCENT = Number(process.env.BUZZARD_PRICE_ALERT_PERCENT || 25);

function ensureDataFile(filePath, fallback) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function readJson(filePath, fallback) {
  ensureDataFile(filePath, fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDataFile(filePath, Array.isArray(data) ? [] : {});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nextId(prefix, list) {
  const nums = list.map((e) => Number(String(e.id).replace(`${prefix}-`, ""))).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

function validateIncomingPrice(price) {
  const amount = Number(price?.amount ?? price);
  if (Number.isNaN(amount) || amount < 0) return { ok: false, error: "invalid_price" };
  if (amount === 0) return { ok: true, value: { amount: 0, currency: price?.currency || "EUR" }, warning: "zero_price" };
  if (amount > 999999) return { ok: false, error: "price_too_high" };
  return { ok: true, value: { amount: Math.round(amount * 100) / 100, currency: price?.currency || "EUR" } };
}

function detectPriceAnomaly(oldAmount, newAmount) {
  const oldVal = Number(oldAmount) || 0;
  const newVal = Number(newAmount) || 0;
  if (oldVal <= 0 || newVal <= 0) return { anomaly: false, changePercent: 0 };
  const changePercent = Math.abs(((newVal - oldVal) / oldVal) * 100);
  return {
    anomaly: changePercent >= LARGE_CHANGE_PERCENT,
    changePercent: Math.round(changePercent * 100) / 100,
    requiresApproval: changePercent >= LARGE_CHANGE_PERCENT,
  };
}

function recordAudit(entry) {
  const audit = readJson(auditFile, []);
  const row = {
    id: nextId("psa", audit),
    ...entry,
    created_at: new Date().toISOString(),
  };
  audit.unshift(row);
  writeJson(auditFile, audit.slice(0, 5000));
  return row;
}

function enqueueJob(job) {
  const queue = readJson(queueFile, []);
  const row = {
    id: nextId("psq", queue),
    status: "queued",
    attempts: 0,
    created_at: new Date().toISOString(),
    ...job,
  };
  queue.unshift(row);
  writeJson(queueFile, queue.slice(0, 2000));
  return row;
}

function listQueue(status, limit = 50) {
  let queue = readJson(queueFile, []);
  if (status) queue = queue.filter((j) => j.status === status);
  return queue.slice(0, limit);
}

function listAudit(limit = 100) {
  return readJson(auditFile, []).slice(0, limit);
}

function processNextJob(processor) {
  const queue = readJson(queueFile, []);
  const idx = queue.findIndex((j) => j.status === "queued");
  if (idx < 0) return { processed: false, reason: "queue_empty" };

  const job = queue[idx];
  job.status = "processing";
  job.attempts += 1;
  writeJson(queueFile, queue);

  try {
    const result = processor(job);
    job.status = result?.requiresApproval ? "waiting_approval" : "completed";
    job.result = result;
    job.finished_at = new Date().toISOString();
    recordAudit({ type: job.job_type, product_id: job.product_id, job_id: job.id, result });
  } catch (error) {
    job.status = job.attempts >= 3 ? "failed" : "queued";
    job.error = error.message;
    recordAudit({ type: job.job_type, product_id: job.product_id, job_id: job.id, error: error.message });
  }

  queue[idx] = job;
  writeJson(queueFile, queue);
  return { processed: true, job };
}

function applyPriceStockUpdate() {
  return {
    ok: false,
    code: "STOCK_UNVERIFIED",
    applied: false,
    purchased: false,
    stock: null,
    live: false,
    reasons: ["SALES_CLOSED", "STOCK_UNVERIFIED", "SUPPLIER_COST_UNVERIFIED"],
  };
}

module.exports = {
  validateIncomingPrice,
  detectPriceAnomaly,
  enqueueJob,
  listQueue,
  listAudit,
  processNextJob,
  applyPriceStockUpdate,
  recordAudit,
  LARGE_CHANGE_PERCENT,
};
