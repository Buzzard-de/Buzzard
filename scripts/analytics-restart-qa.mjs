#!/usr/bin/env node
/**
 * SQLite persistence restart + purchase idempotency QA
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.BUZZARD_API_URL || "http://localhost:3001";

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@buzzard.de",
      password: process.env.ADMIN_PASSWORD || "BuzzardAdmin2026!",
    }),
  });
  const json = await res.json();
  return json.token;
}

async function kpiOrders(token) {
  const res = await fetch(`${API}/api/admin/analytics-foundation/kpis?range=last_30_days`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json?.data?.executive?.orders ?? -1;
}

async function runVitestPersistence() {
  const result = spawnSync("npm", ["run", "test:analytics-persistence"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error("analytics-persistence tests failed");
  }
}

async function main() {
  const token = await login();
  if (!token) throw new Error("login failed");

  const before = await kpiOrders(token);
  await runVitestPersistence();
  const after = await kpiOrders(token);

  if (before >= 0 && after >= 0) {
    console.log(`KPI orders before=${before} after=${after} (persistence suite passed)`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
