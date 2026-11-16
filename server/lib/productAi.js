/** Product AI enrichment + human review queue (P1-08). Authority gate, no provider call. */

const fs = require("fs");
const path = require("path");
const productValidator = require("./productValidator");
const { screenProductAi, holdCommercialAiAction } = require("./aiCenterAuthority");

const reviewFile = path.join(__dirname, "..", "data", "ai-review-queue.json");

function readQueue() {
  try {
    if (!fs.existsSync(reviewFile)) return [];
    return JSON.parse(fs.readFileSync(reviewFile, "utf8"));
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  const dir = path.dirname(reviewFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reviewFile, JSON.stringify(queue.slice(0, 2000), null, 2), "utf8");
}

function nextReviewId(queue) {
  const nums = queue.map((e) => Number(String(e.id).replace("air-", ""))).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `air-${String(next).padStart(6, "0")}`;
}

function enqueueReview(entry) {
  const queue = readQueue();
  const row = {
    id: nextReviewId(queue),
    status: "pending",
    created_at: new Date().toISOString(),
    ...entry,
  };
  queue.unshift(row);
  writeQueue(queue);
  return row;
}

function listReviews(status, limit = 50) {
  let queue = readQueue();
  if (status) queue = queue.filter((r) => r.status === status);
  return queue.slice(0, limit);
}

function updateReview(id, patch) {
  const queue = readQueue();
  const idx = queue.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  queue[idx] = { ...queue[idx], ...patch, updated_at: new Date().toISOString() };
  writeQueue(queue);
  return queue[idx];
}

async function enrichProduct(input = {}, options = {}) {
  const decision = screenProductAi({
    name: input.name,
    description: input.description || input.short_description,
    action: input.action || options.action,
    surface: "product_ai",
  });
  if (decision.commercial) {
    const deps = options.deps || require("./controlCenterJobAdmission").peripheralDeps();
    return holdCommercialAiAction({
      surface: "product_ai",
      text: decision.query,
      action: input.action || options.action,
      actor: "product_ai",
      subjectId: input.id || input.sku || null,
      deps,
    });
  }
  const eanCheck = input.ean_gtin ? productValidator.validateEan(input.ean_gtin) : { ok: true, warning: "missing_ean" };
  const result = {
    ...decision,
    title: input.name || null,
    description: input.description || input.short_description || null,
    i18n: {},
    providerCalled: false,
    executed: false,
    dryRun: true,
    demo: true,
    orderStarted: false,
    paymentStarted: false,
    cancelStarted: false,
    refundStarted: false,
    purchaseStarted: false,
    warnings: ["PROVIDER_DISABLED"],
  };
  if (!eanCheck.ok) result.warnings.push(eanCheck.error);
  if (eanCheck.warning) result.warnings.push(eanCheck.warning);
  return result;
}

function detectDuplicateCandidates(product, allProducts = []) {
  const name = String(product.name || "").toLowerCase();
  const brand = String(product.brand || "").toLowerCase();
  return allProducts
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (product.ean_gtin && p.ean_gtin === product.ean_gtin) score += 1;
      if (p.supplier_id === product.supplier_id && p.supplier_sku === product.supplier_sku) score += 1;
      const otherName = String(p.name || "").toLowerCase();
      if (name && otherName && name === otherName && brand === String(p.brand || "").toLowerCase()) score += 0.5;
      return score >= 0.5 ? { product_id: p.id, sku: p.sku, score } : null;
    })
    .filter(Boolean);
}

module.exports = {
  enrichProduct,
  enqueueReview,
  listReviews,
  updateReview,
  detectDuplicateCandidates,
};
