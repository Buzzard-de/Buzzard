#!/usr/bin/env node
/**
 * Verify Buzzard go-live readiness: storefront + admin routes + API health.
 *
 * Usage:
 *   node scripts/verify-go-live.mjs
 *   BUZZARD_SITE_URL=https://buzzard24.de node scripts/verify-go-live.mjs
 */

const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

const STOREFRONT_ROUTES = [
  "/",
  "/produkt/bremsscheibe-vorderachse-280mm/",
  "/warenkorb/",
  "/konto/login/",
  "/kategori/tekstil/",
  "/impressum/",
  "/datenschutz/",
];

const ADMIN_ROUTES = [
  "",
  "login",
  "analytics",
  "analytics-dashboard",
  "marketing-center",
  "marketplace-hub",
  "seo",
  "products",
  "catalog",
  "pim-catalog",
  "identity-security",
  "payments-finance",
  "order-management",
  "cart-checkout",
  "crm-customer-service",
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
  "localization",
  "customer-checkout",
  "customer-support",
  "contact-submissions",
  "crm-loyalty",
  "suppliers",
  "supplier-hub",
  "integrations",
  "sync",
  "orders",
  "logistics",
  "logistics-fulfillment",
  "wms-inventory",
  "automation",
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
  console.log("Buzzard go-live verification");
  console.log(`Site: ${SITE}`);
  console.log(`API:  ${API}`);
  console.log("");

  let failed = 0;

  console.log("Storefront (GitHub Pages):");
  for (const route of STOREFRONT_ROUTES) {
    const result = await checkUrl(`${SITE}${route}`);
    const mark = result.ok ? "OK" : "FAIL";
    console.log(`  [${mark}] ${result.status} ${route}`);
    if (!result.ok) failed += 1;
  }

  console.log("");
  console.log("Admin routes (GitHub Pages):");
  for (const route of ADMIN_ROUTES) {
    const path = route ? `/admin/${route}/` : "/admin/";
    const result = await checkUrl(`${SITE}${path}`);
    const mark = result.ok ? "OK" : "FAIL";
    console.log(`  [${mark}] ${result.status} ${path}`);
    if (!result.ok) failed += 1;
  }

  console.log("");
  console.log("API health:");
  let routing = null;
  try {
    const res = await fetch(`${API}/api/health`, { headers: { Accept: "application/json" } });
    routing = res.headers.get("x-render-routing");
    if (res.ok) {
      const body = await res.json();
      const modules = Object.entries(body).filter(
        ([k, v]) => typeof v === "object" && v && v.enabled === true
      ).length;
      console.log(`  [OK] ${res.status} /api/health (${modules} enabled modules)`);
    } else if (routing === "no-server") {
      console.log("  [PENDING] Render no-server — API später verbinden:");
      console.log("  https://github.com/apps/render (GitHub App) → dann https://render.com → Blueprint");
    } else {
      console.log(`  [FAIL] ${res.status} /api/health`);
      failed += 1;
    }
  } catch (error) {
    console.log(`  [FAIL] /api/health — ${error.message}`);
    failed += 1;
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("All automated checks passed (API pending Render is OK).");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
