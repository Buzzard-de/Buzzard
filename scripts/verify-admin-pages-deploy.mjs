#!/usr/bin/env node
/**
 * Verify admin pages deploy gap: local static export + live HTTP (no fake PASS on live).
 *
 * Usage:
 *   node scripts/verify-admin-pages-deploy.mjs
 *   BUZZARD_SITE_URL=https://buzzard24.de node scripts/verify-admin-pages-deploy.mjs
 */

import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const OUT = path.resolve(process.cwd(), "out");

const ROUTES = [
  { key: "ADMIN_RETURNS", local: "admin/returns/index.html", live: "/admin/returns/" },
  {
    key: "ADMIN_ANALYTICS_FOUNDATION",
    local: "admin/analytics-foundation/index.html",
    live: "/admin/analytics-foundation/",
  },
];

function localPass(relativePath) {
  return fs.existsSync(path.join(OUT, relativePath));
}

async function liveStatus(urlPath) {
  try {
    const res = await fetch(`${SITE}${urlPath}`, { redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  }
}

function liveLabel(status) {
  if (status === 200) return "PASS";
  if (status === 404 || status === 0) return "UNVERIFIED_EXTERNAL";
  return "FAIL";
}

const localBuildOk = fs.existsSync(OUT);
const results = {};

for (const r of ROUTES) {
  results[r.key] = {
    local: localPass(r.local) ? "PASS" : "FAIL",
    liveStatus: await liveStatus(r.live),
  };
  results[r.key].live = liveLabel(results[r.key].liveStatus);
}

const allLocal =
  results.ADMIN_RETURNS.local === "PASS" &&
  results.ADMIN_ANALYTICS_FOUNDATION.local === "PASS";

const allLivePass =
  results.ADMIN_RETURNS.live === "PASS" && results.ADMIN_ANALYTICS_FOUNDATION.live === "PASS";

const report = {
  LOCAL_BUILD: localBuildOk && allLocal ? "PASS" : localBuildOk ? "FAIL" : "FAIL",
  ADMIN_RETURNS_LOCAL: results.ADMIN_RETURNS.local,
  ADMIN_ANALYTICS_FOUNDATION_LOCAL: results.ADMIN_ANALYTICS_FOUNDATION.local,
  LIVE_ADMIN_RETURNS: results.ADMIN_RETURNS.live,
  LIVE_ADMIN_ANALYTICS_FOUNDATION: results.ADMIN_ANALYTICS_FOUNDATION.live,
  LIVE_HTTP: {
    returns: results.ADMIN_RETURNS.liveStatus,
    analyticsFoundation: results.ADMIN_ANALYTICS_FOUNDATION.liveStatus,
  },
  PAGES_DEPLOY: allLivePass ? "VERIFIED" : "HUMAN_REQUIRED",
  SALES_ENABLED: "0",
  SITE,
};

console.log(JSON.stringify(report, null, 2));

if (!allLivePass) {
  console.error("\nHUMAN ACTION REQUIRED:");
  console.error("Merge/Push to main and trigger/await GitHub Pages deployment.");
  console.error("Then re-run: npm run build && npm run verify:admin-pages-deploy");
}

process.exit(localBuildOk && allLocal ? 0 : 1);
