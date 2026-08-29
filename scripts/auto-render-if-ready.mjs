#!/usr/bin/env node
/**
 * Cloud Agent start hook: trigger Render deploy when credentials are available.
 * Supports RENDER_DEPLOY_HOOK_URL (preferred) or RENDER_API_KEY (bootstrap + deploy).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hook = process.env.RENDER_DEPLOY_HOOK_URL?.trim();
const key = process.env.RENDER_API_KEY?.trim();
const apiUrl = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

async function versionReady() {
  try {
    const res = await fetch(`${apiUrl}/api/health/version`, { headers: { Accept: "application/json" } });
    return res.ok;
  } catch {
    return false;
  }
}

async function triggerHook() {
  console.log("[buzzard] RENDER_DEPLOY_HOOK_URL detected — triggering Render deploy…");
  const res = await fetch(hook, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[buzzard] Deploy hook failed (${res.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log("[buzzard] Deploy hook accepted — waiting for Part 13+ version endpoint…");
  const started = Date.now();
  const timeoutMs = Number(process.env.RENDER_DEPLOY_WAIT_MS || 20 * 60 * 1000);
  while (Date.now() - started < timeoutMs) {
    if (await versionReady()) {
      console.log("[buzzard] Production API updated (/api/health/version OK).");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  console.warn("[buzzard] Deploy triggered but version endpoint still pending — check Render dashboard.");
}

async function main() {
  if (await versionReady()) {
    console.log("[buzzard] Production API already on Part 13+ build.");
    return;
  }

  if (hook) {
    await triggerHook();
    return;
  }

  if (key) {
    console.log("[buzzard] RENDER_API_KEY detected — bootstrapping buzzard-api on Render…");
    const result = spawnSync("node", [path.join(root, "scripts/render-bootstrap.mjs")], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    process.exit(result.status ?? 1);
  }

  console.log("[buzzard] No RENDER_DEPLOY_HOOK_URL or RENDER_API_KEY — skip Render auto-deploy.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
