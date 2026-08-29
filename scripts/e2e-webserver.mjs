#!/usr/bin/env node
/**
 * Start API + Next.js for Playwright E2E with commerce flags.
 * Reuses an already-running API when healthy.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_URL = "http://localhost:3001";
const WEB_URL = "http://localhost:3000";

const env = {
  ...process.env,
  BUZZARD_SALES_ENABLED: "0",
  NEXT_PUBLIC_SALES_ENABLED: "0",
  NEXT_PUBLIC_COMMERCE_CORE: "1",
  NEXT_PUBLIC_BUZZARD_API_URL: API_URL,
  BUZZARD_COMMERCE_CORE: "1",
  BUZZARD_TEST_MODE: "1",
  FORCE_COLOR: "1",
};

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

async function isHealthy(url) {
  try {
    const res = await fetch(`${url}/api/health`, { headers: { Accept: "application/json" } });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(url, label, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await isHealthy(url)) {
      console.log(`[e2e] ${label} ready`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`${label} did not become ready within ${maxMs}ms`);
}

async function waitForWeb(url, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) {
        console.log("[e2e] Next.js storefront ready");
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Storefront did not become ready within ${maxMs}ms`);
}

console.log("[e2e] Starting Buzzard stack for Playwright…");

let api = null;
if (await isHealthy(API_URL)) {
  console.log("[e2e] Reusing existing API on :3001");
} else {
  console.log(`[e2e] Starting API → ${API_URL}`);
  api = run("api", "npm", ["run", "dev:api"], root);
  await waitForHealth(API_URL, "API");
}

let web = null;
try {
  const probe = await fetch(WEB_URL, { redirect: "manual" });
  if (probe.status < 500) {
    console.log("[e2e] Reusing existing storefront on :3000");
  } else {
    throw new Error("storefront unhealthy");
  }
} catch {
  console.log(`[e2e] Starting storefront → ${WEB_URL}`);
  web = run("web", "npm", ["run", "dev"], root);
  await waitForWeb(WEB_URL);
}

function shutdown() {
  if (api) api.kill("SIGTERM");
  if (web) web.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await new Promise(() => {});
