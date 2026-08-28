/** Product AI enrichment + human review queue (P1-08). Demo adapter — no invented EANs/specs. */

const fs = require("fs");
const path = require("path");
const aiCenter = require("./aiCenter");
const productValidator = require("./productValidator");
const { fetchOrchestrator, isOrchestratorConfigured } = require("./orchestratorBridge");

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

async function enrichProduct(input, options = {}) {
  const language = options.language || "de";
  const locales = options.locales || ["de", "en", "tr", "ar"];

  const copy = aiCenter.aiAdapter({
    task: "product_copy",
    input: `${input.name || ""}\n${input.description || input.short_description || ""}`,
    language,
  });

  const translations = {};
  for (const locale of locales) {
    if (locale === language) continue;
    const translated = aiCenter.aiAdapter({ task: "translate", input: copy.description || input.description, language: locale });
    translations[locale] = {
      name: input.name,
      short_description: translated.text?.slice(0, 240) || input.short_description,
      description: translated.text || input.description,
      source: "ai_demo",
      confidence: 0.5,
    };
  }

  const eanCheck = input.ean_gtin ? productValidator.validateEan(input.ean_gtin) : { ok: true, warning: "missing_ean" };

  const result = {
    title: copy.title || input.name,
    description: copy.description || input.description,
    i18n: { [language]: { name: input.name, description: copy.description }, ...translations },
    ai_source: copy.provider || "adapter",
    ai_confidence: 0.55,
    demo: copy.demo === true,
    warnings: [],
  };

  if (!eanCheck.ok) result.warnings.push(eanCheck.error);
  if (eanCheck.warning) result.warnings.push(eanCheck.warning);

  if (options.submitForReview !== false) {
    enqueueReview({
      type: "product_enrichment",
      product_id: input.id || input.sku,
      payload: result,
      source: result.ai_source,
      confidence: result.ai_confidence,
    });
  }

  if (isOrchestratorConfigured()) {
    fetchOrchestrator("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: "product_enrichment",
        payload: { product_id: input.id || input.sku, demo: true },
        priority: "normal",
      }),
    }).catch(() => {});
  }

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
