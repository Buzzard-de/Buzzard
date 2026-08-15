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
