/** Category intelligence bridge (P1-09). Report-only — no direct category mutations. */

const { fetchOrchestrator, isOrchestratorConfigured } = require("./orchestratorBridge");

function summarizeCategoryProducts(products, categoryId) {
  const inCategory = products.filter(
    (p) => p.category_id === categoryId || (p.category_ids || []).includes(categoryId)
  );
  const active = inCategory.filter((p) => p.status === "active");
  const outOfStock = inCategory.filter((p) => p.stock_status === "out_of_stock" || p.stock <= 0);
  const prices = inCategory.map((p) => Number(p.price?.amount || 0)).filter((n) => n > 0);
  const avgPrice = prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0;

  return {
    category_id: categoryId,
    product_count: inCategory.length,
    active_count: active.length,
    out_of_stock_count: outOfStock.length,
    average_price: avgPrice,
    sales_enabled: false,
    note: "Catalog mode — sales summaries unavailable.",
  };
}

function detectOpportunities(products, categories = []) {
  const byCategory = new Map();
  for (const p of products) {
    const cid = p.category_id || "unknown";
    byCategory.set(cid, (byCategory.get(cid) || 0) + 1);
  }

  return categories
    .filter((c) => (byCategory.get(c.id) || 0) < 2)
    .slice(0, 10)
    .map((c) => ({
      category_id: c.id,
      category_name: c.name || c.id,
      product_count: byCategory.get(c.id) || 0,
      opportunity: "low_product_coverage",
      recommendation: "Consider adding demo products or supplier mapping for this category.",
      requires_approval: true,
    }));
}

async function analyzeCategory({ categoryId, products = [], categories = [] }) {
  const summary = summarizeCategoryProducts(products, categoryId);
  const opportunities = detectOpportunities(products, categories);
  const findings = {
    summary,
    opportunities: opportunities.filter((o) => o.category_id === categoryId),
    trend: {
      interface: "report_only",
      signal: summary.product_count >= 5 ? "stable" : "under_catalogued",
      confidence: 0.5,
      source: "catalog_stats",
    },
    policy: "findings_report_only_no_auto_mutations",
    generated_at: new Date().toISOString(),
  };

  if (isOrchestratorConfigured()) {
    fetchOrchestrator("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: "category_intelligence",
        payload: { category_id: categoryId, findings },
        priority: "low",
      }),
    }).catch(() => {});
  }

  return findings;
}

module.exports = {
  summarizeCategoryProducts,
  detectOpportunities,
  analyzeCategory,
};
