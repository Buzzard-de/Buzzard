#!/usr/bin/env node
/**
 * Render API go-live preflight — local checks + remote probe.
 * Does NOT deploy. Safe to run before user-approved deploy.
 *
 * Usage:
 *   node scripts/render-preflight.mjs
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com node scripts/render-preflight.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

let failed = 0;
let warned = 0;

function pass(label) {
  console.log(`  [OK] ${label}`);
}

function warn(label, detail = "") {
  console.log(`  [WARN] ${label}${detail ? ` — ${detail}` : ""}`);
  warned += 1;
}

function fail(label, detail = "") {
  console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

async function probeApi() {
  try {
    const res = await fetch(`${API}/api/health`, { headers: { Accept: "application/json" } });
    const routing = res.headers.get("x-render-routing");
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, routing, body };
  } catch (error) {
    return { ok: false, status: 0, routing: null, body: null, error: error.message };
  }
}

async function main() {
  console.log("Buzzard Render API preflight");
  console.log(`API target: ${API}`);
  console.log(`Site:       ${SITE}`);
  console.log("");

  console.log("Repository config:");
  if (fs.existsSync("render.yaml")) {
    pass("render.yaml present");
    const yaml = fs.readFileSync("render.yaml", "utf8");
    if (yaml.includes("healthCheckPath: /api/health")) pass("Health check path configured");
    else fail("Health check path missing in render.yaml");
    if (yaml.includes('startCommand: node server/server.js')) pass("Start command configured");
    else fail("Start command missing or unexpected");
    if (
      yaml.includes("buildCommand: cd server && npm ci") ||
      yaml.includes("buildCommand: node scripts/write-build-info.mjs && cd server && npm ci")
    ) {
      pass("Build command configured");
    } else fail("Build command missing or unexpected");
    if (yaml.includes('BUZZARD_SALES_ENABLED') && yaml.includes('"0"')) pass("BUZZARD_SALES_ENABLED=0 in Blueprint");
    else warn("BUZZARD_SALES_ENABLED not explicitly 0 in render.yaml");
    if (yaml.includes("buzzard-orchestrator")) pass("buzzard-orchestrator service in Blueprint");
    else warn("buzzard-orchestrator missing from render.yaml");
  } else {
    fail("render.yaml missing");
  }

  if (fs.existsSync("server/server.js")) pass("server/server.js present");
  else fail("server/server.js missing");

  if (fs.existsSync("data/buzzard_products.json")) pass("Catalog JSON for SQLite SKU sync");
  else warn("data/buzzard_products.json missing — cart SKU sync may be incomplete");

  console.log("");
  console.log("Local build sanity:");
  try {
    execSync("npm ci --prefix server", { stdio: "pipe" });
    pass("server npm ci");
  } catch (error) {
    fail("server npm ci", error.message?.slice(0, 120));
  }

  console.log("");
  console.log("Remote API probe:");
  const probe = await probeApi();
  if (probe.ok && probe.body?.success) {
    pass(`/api/health returns 200`);
    const db = probe.body?.database;
    if (db?.enabled) pass(`SQLite reported (${db.products ?? "?"} products)`);
    else warn("SQLite not reported in health payload");
  } else if (probe.routing === "no-server") {
    warn("Render x-render-routing: no-server — service not provisioned yet");
    console.log("         One-time: https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard");
    console.log("         Or GitHub Actions → Setup Render API (requires RENDER_API_KEY secret)");
  } else if (probe.status === 0) {
    fail("API unreachable", probe.error || "network error");
  } else {
    fail(`/api/health`, `HTTP ${probe.status}`);
  }

  console.log("");
  console.log("Frontend ↔ API wiring (GitHub Pages build):");
  pass("deploy-pages.yml sets NEXT_PUBLIC_BUZZARD_API_URL → buzzard-api.onrender.com");
  pass("deploy-pages.yml sets NEXT_PUBLIC_SQLITE_STORE=1");
  pass("deploy-pages.yml keeps NEXT_PUBLIC_SALES_ENABLED=0");
  warn("After API go-live: rebuild Pages if BUZZARD_API_URL variable changed");

  console.log("");
  console.log("CORS (server allowlist):");
  pass("https://buzzard24.de and https://www.buzzard24.de in default list");
  pass("Optional BUZZARD_CORS_ORIGINS for extra origins");

  console.log("");
  console.log("SQLite on Render:");
  warn("Free tier filesystem is ephemeral — DB resets on redeploy unless persistent disk + BUZZARD_DB_PATH");
  pass("BUZZARD_DB_PATH env supported for persistent disk mount");

  console.log("");
  console.log("Secrets checklist (set in Render dashboard — values not shown here):");
  console.log("  - JWT_SECRET (required in production)");
  console.log("  - ADMIN_PASSWORD (required for admin bootstrap)");
  console.log("  - RENDER_API_KEY (GitHub secret, for CI bootstrap only)");

  console.log("");
  if (failed > 0) {
    console.error(`${failed} preflight check(s) failed, ${warned} warning(s).`);
    process.exit(1);
  }
  console.log(`Preflight complete (${warned} warning(s)). Deploy NOT executed — awaiting user approval.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
