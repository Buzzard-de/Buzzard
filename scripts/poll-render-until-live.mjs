#!/usr/bin/env node
/**
 * Poll production until Part 13+ endpoints are live.
 * Usage: node scripts/poll-render-until-live.mjs [minutes]
 */
const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const minutes = Number(process.argv[2] || process.env.POLL_MINUTES || 20);
const timeoutMs = minutes * 60 * 1000;
const started = Date.now();

async function check() {
  const version = await fetch(`${API}/api/health/version`, { headers: { Accept: "application/json" } });
  const production = await fetch(`${API}/api/health/production`, { headers: { Accept: "application/json" } });
  return {
    version: version.status,
    production: production.status,
    body: version.ok ? await version.json().catch(() => ({})) : null,
  };
}

console.log(`Polling ${API} for up to ${minutes} minutes…`);

while (Date.now() - started < timeoutMs) {
  try {
    const result = await check();
    const elapsed = Math.round((Date.now() - started) / 1000);
    console.log(`[${elapsed}s] version=${result.version} production=${result.production}`);
    if (result.version === 200 && result.production === 200) {
      console.log(`LIVE: commit=${result.body?.commit || "?"} sales=${result.body?.salesEnabled}`);
      process.exit(0);
    }
  } catch (error) {
    console.log(`pending: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

console.error("Timed out — Render deploy not observed. Add RENDER_DEPLOY_HOOK_URL or manual deploy.");
process.exit(1);
