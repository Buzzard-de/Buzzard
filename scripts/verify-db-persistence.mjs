#!/usr/bin/env node
/**
 * Verify live SQLite persistence on Render.
 * Exit 0 only when persistent=true and path under /var/data.
 */
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

async function main() {
  const res = await fetch(`${API}/api/health/db`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.error(`FAIL: /api/health/db HTTP ${res.status}`);
    process.exit(1);
  }
  const { database } = await res.json();
  const path = database?.path || "";
  const p = database?.persistence || {};

  console.log("DB Persistence Check");
  console.log(`  API:        ${API}`);
  console.log(`  path:       ${path}`);
  console.log(`  mode:       ${p.mode}`);
  console.log(`  persistent: ${p.persistent}`);

  if (p.persistent === true && path.includes("/var/data")) {
    console.log("\nPASS — persistent disk active");
    process.exit(0);
  }

  if (p.syncHint) console.log(`  hint:       ${p.syncHint}`);
  if (p.renderDisk) {
    console.log(`  /var/data:  exists=${p.renderDisk.exists} writable=${p.renderDisk.writable}`);
    console.log(`  env path:   ${p.renderDisk.envBuzzardDbPath || "(not set)"}`);
  }

  console.log("\nFAIL — still ephemeral");
  console.log("Action: docs/DB_PERSISTENCE_RENDER_DE.md (Blueprint sync or RENDER_API_KEY apply)");
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
