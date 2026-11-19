const { calculateSalePrice, applySafetyStock } = require("./pricing");

/** Price/stock queue + audit (P1-07). Catalog mode — no sales activation. */

const fs = require("fs");
const path = require("path");

const queueFile = path.join(require("./dataDir").resolveDataDir(), "price-stock-queue.json");
const auditFile = path.join(require("./dataDir").resolveDataDir(), "price-stock-audit.json");

const LARGE_CHANGE_PERCENT = Number(process.env.BUZZARD_PRICE_ALERT_PERCENT || 25);

let guardianBridge;
function getGuardianBridge() {
  if (!guardianBridge) {
    try {
      guardianBridge = require("./guardianBridge");
    } catch {
      guardianBridge = null;
    }
  }
  return guardianBridge;
}

async function notifyGuardianPriceAnomaly(productId, oldPrice, newPrice) {
  const bridge = getGuardianBridge();
  if (!bridge?.isGuardianConfigured?.()) return;
  const qs = new URLSearchParams({
    product_id: String(productId),
    old_price: String(Number(oldPrice) || 0),
    new_price: String(Number(newPrice) || 0),
    threshold_pct: String(LARGE_CHANGE_PERCENT),
  });
  await bridge.fetchGuardian(`/anomalies/price?${qs}`, { method: "POST" });
}

async function notifyGuardianStockAnomaly(productId, oldStock, newStock) {
  const bridge = getGuardianBridge();
  if (!bridge?.isGuardianConfigured?.()) return;
  const qs = new URLSearchParams({
    product_id: String(productId),
    old_stock: String(Number(oldStock) || 0),
    new_stock: String(Number(newStock) || 0),
  });
  await bridge.fetchGuardian(`/anomalies/stock?${qs}`, { method: "POST" });
}

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
    attempts: 0,
    created_at: new Date().toISOString(),
    ...job,
    status: "APPROVAL_REQUIRED",
    dryRun: true,
    executed: false,
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

function processNextJob() {
  const { assertPeripheralExecution, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const controlCenter = require("./controlCenter");
  const queue = readJson(queueFile, []);
  const idx = queue.findIndex((job) => job.status === "queued" || job.status === "waiting_approval");
  if (idx < 0) return { processed: false, reason: "queue_empty", executed: false };
  const job = queue[idx];
  const approval = job.approvalId ? controlCenter.getApproval(job.approvalId) : null;
  const gate = assertPeripheralExecution({
    source: PERIPHERAL_AUTOMATION_SOURCES.PRICE_STOCK,
    jobType: job.job_type,
    jobId: job.approvalJobId || null,
    approval,
  });
  job.dryRun = true;
  job.executed = false;
  job.finished_at = new Date().toISOString();
  if (!gate.ok) {
    job.status = "refused";
    job.error = gate.code;
    queue[idx] = job;
    writeJson(queueFile, queue);
    return { processed: false, refused: true, executed: false, dryRun: true, code: gate.code, job };
  }
  const consumed = job.approvalId ? require("./controlCenterJobAdmission").peripheralDeps().consumeApproval(job.approvalId) : false;
  if (!consumed) {
    job.status = "refused";
    job.error = "APPROVAL_ALREADY_USED";
    queue[idx] = job;
    writeJson(queueFile, queue);
    return { processed: false, refused: true, executed: false, dryRun: true, code: "APPROVAL_ALREADY_USED", job };
  }
  job.status = "dry_run";
  job.error = null;
  queue[idx] = job;
  writeJson(queueFile, queue);
  return { processed: true, executed: false, dryRun: true, job };
}

function applyPriceStockUpdate({ productId, supplierPrice, stock, supplier, previous = {}, approval, approvalId, jobId, actor }) {
  const { admitPeripheralAutomation, assertPeripheralExecution, peripheralDeps, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  let bound = approval || null;
  if (!bound && approvalId) bound = require("./controlCenter").getApproval(approvalId);
  if (!bound) {
    const admitted = admitPeripheralAutomation({
      source: PERIPHERAL_AUTOMATION_SOURCES.PRICE_STOCK,
      jobType: "price_stock_apply",
      actor: actor || "price_stock",
      subjectId: productId == null ? null : String(productId),
      deps: peripheralDeps(),
    });
    if (!admitted.ok) {
      return { ok: false, code: admitted.code, applied: false, executed: false, dryRun: true, requiresApproval: true };
    }
    return {
      ok: true,
      pendingApproval: true,
      requiresApproval: true,
      applied: false,
      executed: false,
      dryRun: true,
      approval: admitted.approval,
      job: null,
      jobId: admitted.jobId,
    };
  }
  const gate = assertPeripheralExecution({
    source: PERIPHERAL_AUTOMATION_SOURCES.PRICE_STOCK,
    jobType: "price_stock_apply",
    jobId,
    approval: bound,
  });
  if (!gate.ok) {
    return { ok: false, code: gate.code, applied: false, executed: false, dryRun: true, requiresApproval: true };
  }
  const consumed = peripheralDeps().consumeApproval(bound.id);
  if (!consumed) {
    return { ok: false, code: "APPROVAL_ALREADY_USED", applied: false, executed: false, dryRun: true, requiresApproval: true };
  }
  const priceCheck = validateIncomingPrice(supplierPrice);
  if (!priceCheck.ok) {
    return { ok: false, error: priceCheck.error, applied: false, executed: false, dryRun: true };
  }

  const salePrice = calculateSalePrice({
    supplierPrice: priceCheck.value.amount,
    markupPercent: supplier?.default_markup_percent ?? 38,
    minimumMarginPercent: supplier?.minimum_margin_percent ?? 12,
    currency: priceCheck.value.currency,
  });

  const anomaly = detectPriceAnomaly(previous.supplier_price?.amount, priceCheck.value.amount);
  const stockInfo = applySafetyStock(stock, supplier?.safety_stock ?? 0);

  const update = {
    supplier_price: priceCheck.value,
    price: salePrice,
    stock: stockInfo.stock,
    stock_status: stockInfo.stock_status,
  };

  return {
    ok: true,
    pendingApproval: false,
    requiresApproval: false,
    applied: false,
    executed: false,
    dryRun: true,
    update,
    anomaly,
    warnings: priceCheck.warning ? [priceCheck.warning] : [],
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
