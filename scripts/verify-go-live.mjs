#!/usr/bin/env node
/**
 * Verify Buzzard go-live readiness: storefront + admin routes + API health.
 *
 * Usage:
 *   node scripts/verify-go-live.mjs
 *   BUZZARD_SITE_URL=https://buzzard24.de node scripts/verify-go-live.mjs
 */

import { ADMIN_ROUTE_SLUGS } from "../lib/admin/nav.config.mjs";

const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const RETRIES = Number(process.env.BUZZARD_VERIFY_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.BUZZARD_VERIFY_RETRY_MS || 4000);
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const STOREFRONT_ROUTES = [
  "/",
  "/produkt/bremsscheibe-vorderachse-280mm/",
  "/warenkorb/",
  "/wunschliste/",
  "/checkout/",
  "/checkout/erfolg/",
  "/store/",
  "/products/",
  "/konto/",
  "/konto/login/",
  "/konto/registrieren/",
  "/konto/bestellungen/",
  "/konto/adressen/",
  "/konto/profil/",
  "/konto/einstellungen/",
  "/konto/passwort-vergessen/",
  "/konto/support/",
  "/konto/loyalty/",
  "/kategorie/textil/",
  "/kategorie/automotive/",
  "/kategorie/heimtextilien/",
  "/kategorie/getraenke/",
  "/en/",
  "/tr/",
  "/ar/",
  "/impressum/",
  "/kontakt/",
  "/hilfe/",
  "/agb/",
  "/versand/",
  "/widerruf/",
  "/datenschutz/",
  "/sitemap.xml",
  "/robots.txt",
];

const TAXONOMY_ROUTES = [
  "/taxonomy/buzzard_category_intelligence_maximum_single_file.html",
  "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
  "/taxonomy/buzzard_production_bridge_max_single_file.html",
  "/taxonomy/buzzard_master_kfz_category_tree_v1.html",
  "/taxonomy/buzzard_master_kfz_intelligence_os.html",
  "/taxonomy/buzzard_ai_core_maximum_single_file.html",
  "/taxonomy/buzzard_master_48_main_categories_de.json",
  "/taxonomy/master_shop_l1_mapping.json",
  "/taxonomy/taxonomy_auto_sync_report.json",
  "/taxonomy/kfz_shop_bridge.json",
  "/taxonomy/buzzard_production_preflight.json",
];

const ADMIN_ROUTES = ADMIN_ROUTE_SLUGS;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkUrl(url) {
  let last = { url, status: 0, ok: false, error: "unknown" };

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      const result = { url, status: res.status, ok: res.ok };
      if (result.ok || !RETRYABLE_STATUSES.has(result.status) || attempt === RETRIES) {
        return result;
      }
      last = result;
    } catch (error) {
      last = { url, status: 0, ok: false, error: error.message };
      if (attempt === RETRIES) return last;
    }

    await sleep(RETRY_DELAY_MS);
  }

  return last;
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
  console.log("Taxonomy consoles (GitHub Pages):");
  for (const route of TAXONOMY_ROUTES) {
    const result = await checkUrl(`${SITE}${route}`);
    const mark = result.ok ? "OK" : "FAIL";
    console.log(`  [${mark}] ${result.status} ${route}`);
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
  console.log("Deployment identity (Part 13+):");
  try {
    const res = await fetch(`${API}/api/health/version`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      console.log(
        `  [OK] ${res.status} /api/health/version commit=${body.commit || "?"} sales=${body.salesEnabled}`
      );
    } else if (routing === "no-server") {
      console.log("  [PENDING] API not provisioned on Render yet");
    } else if (res.status === 404) {
      console.log(`  [FAIL] ${res.status} /api/health/version — stale Render (redeploy main required)`);
      failed += 1;
    } else {
      console.log(`  [FAIL] ${res.status} /api/health/version`);
      failed += 1;
    }
  } catch (error) {
    console.log(`  [FAIL] /api/health/version — ${error.message}`);
    failed += 1;
  }

  console.log("");
  console.log("Intelligence bridge (optional):");
  try {
    const res = await fetch(`${API}/api/intelligence/status`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      console.log(
        `  [OK] bridge=${body.bridge} catalogMode=${body.catalogMode} salesEnabled=${body.salesEnabled}`
      );
    } else {
      console.log(`  [SKIP] ${res.status} /api/intelligence/status`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/intelligence/status — ${error.message}`);
  }

  console.log("");
  console.log("Master taxonomy API:");
  try {
    const res = await fetch(`${API}/api/taxonomy/snapshot`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      console.log(
        `  [OK] ${body.master_category_count || body.snapshot?.master_category_count} categories, ${body.total_nodes || body.snapshot?.total_nodes} nodes`
      );
    } else if (routing === "no-server") {
      console.log("  [PENDING] API not provisioned on Render yet");
    } else {
      console.log(`  [SKIP] ${res.status} /api/taxonomy/snapshot`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/taxonomy/snapshot — ${error.message}`);
  }

  console.log("");
  console.log("Taxonomy unification:");
  try {
    const res = await fetch(`${API}/api/taxonomy/status`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      console.log(
        `  [OK] canonical_roots=${body.canonical_roots} aliases=${body.alias_count} status=${body.status}`
      );
    } else if (routing === "no-server") {
      console.log("  [PENDING] API not provisioned on Render yet");
    } else {
      console.log(`  [SKIP] ${res.status} /api/taxonomy/status`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/taxonomy/status — ${error.message}`);
  }

  console.log("");
  console.log("AI orchestrator (optional):");
  try {
    const res = await fetch(`${API}/api/orchestrator/status`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      if (body.configured && body.reachable) {
        console.log(`  [OK] orchestrator reachable (${body.health?.agents ?? "?"} agents)`);
      } else if (body.configured) {
        console.log(`  [WARN] orchestrator configured but unreachable`);
      } else {
        console.log(`  [SKIP] orchestrator not configured yet`);
      }
    } else {
      console.log(`  [SKIP] ${res.status} /api/orchestrator/status`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/orchestrator/status — ${error.message}`);
  }

  console.log("");
  console.log("AI Guardian (optional):");
  try {
    const res = await fetch(`${API}/api/guardian/status`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      if (body.configured && body.reachable) {
        console.log(`  [OK] guardian reachable (sales=${body.health?.sales_enabled})`);
      } else if (body.configured) {
        console.log(`  [WARN] guardian configured but unreachable`);
      } else {
        console.log(`  [SKIP] guardian not configured yet`);
      }
    } else {
      console.log(`  [SKIP] ${res.status} /api/guardian/status`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/guardian/status — ${error.message}`);
  }

  console.log("");
  console.log("P1 catalog platform (optional):");
  try {
    const res = await fetch(`${API}/api/p1/status`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = await res.json();
      console.log(
        `  [OK] catalog_mode=${body.catalog_mode} products=${body.product_count} sales=${body.sales_enabled}`
      );
    } else {
      console.log(`  [SKIP] ${res.status} /api/p1/status`);
    }
  } catch (error) {
    console.log(`  [SKIP] /api/p1/status — ${error.message}`);
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("All automated checks passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
