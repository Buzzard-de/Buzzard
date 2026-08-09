#!/usr/bin/env node
/**
 * Poll Buzzard API /api/health until ready or timeout.
 * Usage: node scripts/wait-for-api-health.mjs [baseUrl]
 */

const DEFAULT_URL = "https://buzzard-api.onrender.com";
const HEALTH_PATH = "/api/health";
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS || 15 * 60 * 1000);
const baseUrl = (process.argv[2] || process.env.BUZZARD_API_URL || DEFAULT_URL).replace(/\/$/, "");
const healthUrl = `${baseUrl}${HEALTH_PATH}`;

async function main() {
  const started = Date.now();
  let attempt = 0;

  console.log(`Waiting for ${healthUrl} (timeout ${Math.round(timeoutMs / 1000)}s)…`);

  while (Date.now() - started < timeoutMs) {
    attempt += 1;
    try {
      const response = await fetch(healthUrl, { headers: { Accept: "application/json" } });
      if (response.ok) {
        const body = await response.text();
        console.log(`Health OK (${response.status}) attempt ${attempt}: ${body.slice(0, 240)}`);
        return;
      }
      console.log(`Health pending (${response.status}) attempt ${attempt}…`);
    } catch (error) {
      console.log(`Health pending attempt ${attempt}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(15000, 5000 + attempt * 1000)));
  }

  console.error(`Timed out waiting for ${healthUrl}`);
  console.error("");
  console.error("Go live (one-time):");
  console.error("https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard");
  console.error("");
  console.error("Or set GitHub secret RENDER_API_KEY and run workflow 'Setup Render API'.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
