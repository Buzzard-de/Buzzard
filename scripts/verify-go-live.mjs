#!/usr/bin/env node
/**
 * Verify Buzzard go-live readiness: Pages admin routes + optional API health.
 *
 * Usage:
 *   node scripts/verify-go-live.mjs
 *   BUZZARD_SITE_URL=https://buzzard24.de node scripts/verify-go-live.mjs
 */

const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

const ADMIN_ROUTES = [
  "returns-rma",
  "marketing-loyalty",
  "reviews-ratings",
  "ai-center",
  "advanced-search",
  "product-catalog-pim",
  "supplier-integration-hub",
  "order-management-v32",
  "fulfillment-v33",
  "logistics-v34",
  "marketplace-v35",
  "payments-v36",
  "international-v37",
  "security-v38",
  "analytics-v39",
  "master-admin-v40",
  "contact-submissions",
];

async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return { url, status: res.status, ok: res.ok };
  } catch (error) {
    return { url, status: 0, ok: false, error: error.message };
  }
}

async function main() {
  console.log(`Buzzard go-live verification`);
  console.log(`Site: ${SITE}`);
  console.log(`API:  ${API}`);
  console.log("");

  let failed = 0;

  console.log("Admin routes (GitHub Pages):");
  for (const route of ADMIN_ROUTES) {
    const result = await checkUrl(`${SITE}/admin/${route}/`);
    const mark = result.ok ? "OK" : "FAIL";
    console.log(`  [${mark}] ${result.status} /admin/${route}/`);
    if (!result.ok) failed += 1;
  }

  console.log("");
  console.log("API health:");
  const health = await checkUrl(`${API}/api/health`);
  const routing = await fetch(`${API}/api/health`)
    .then((res) => res.headers.get("x-render-routing"))
    .catch(() => null);

  if (health.ok) {
    const body = await fetch(`${API}/api/health`).then((r) => r.json());
    const modules = Object.entries(body).filter(
      ([k, v]) => typeof v === "object" && v && (v).enabled === true
    ).length;
    console.log(`  [OK] ${health.status} /api/health (${modules} enabled modules)`);
  } else if (routing === "no-server") {
    console.log("  [PENDING] Render no-server — Blueprint noch nicht verbunden:");
    console.log("  https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard");
  } else {
    console.log(`  [FAIL] ${health.status} /api/health`);
    failed += 1;
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("All automated checks passed (API pending Blueprint is OK).");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
