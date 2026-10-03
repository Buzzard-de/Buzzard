#!/usr/bin/env node
/**
 * Read-only production persistence check against public GET /api/health/db.
 * Does not create orders, payments, supplier calls, or mutate the database.
 */
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  const url = `${API}/api/health/db`;
  console.log(`Production DB persistence check → ${url}`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    fail(`/api/health/db HTTP ${res.status}`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    fail("response is not JSON");
  }

  const persistent = body?.persistence?.persistent;
  const mode = body?.persistence?.mode;
  const salesEnabled = body?.salesEnabled;

  console.log(`  persistent:   ${persistent}`);
  console.log(`  mode:         ${mode}`);
  console.log(`  salesEnabled: ${salesEnabled}`);

  if (persistent !== true) fail("persistent !== true");
  if (mode !== "render_persistent_disk") fail("mode !== render_persistent_disk");
  if (salesEnabled !== false) fail("salesEnabled !== false");
  if (body?.database?.path || body?.database?.configuredPath) {
    fail("public health leaked a database path");
  }

  console.log("PASS — public health reports render_persistent_disk and sales locked");
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
