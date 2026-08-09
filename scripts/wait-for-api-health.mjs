#!/usr/bin/env node
/**
 * Poll Buzzard API /api/health until ready or timeout.
 * Usage: node scripts/wait-for-api-health.mjs [baseUrl]
 *
 * Env:
 *   HEALTH_TIMEOUT_MS — max wait (default 15 min)
 *   FAST_FAIL_NO_SERVER=1 — exit immediately when Render returns x-render-routing: no-server
 *   ALLOW_UNPROVISIONED=1 — exit 0 with warning when no-server (CI when Blueprint not connected yet)
 */

const DEFAULT_URL = "https://buzzard-api.onrender.com";
const HEALTH_PATH = "/api/health";
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS || 15 * 60 * 1000);
const fastFailNoServer = process.env.FAST_FAIL_NO_SERVER === "1";
const allowUnprovisioned = process.env.ALLOW_UNPROVISIONED === "1";
const baseUrl = (process.argv[2] || process.env.BUZZARD_API_URL || DEFAULT_URL).replace(/\/$/, "");
const healthUrl = `${baseUrl}${HEALTH_PATH}`;

const SETUP_URL = "https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard";

function printSetupHelp() {
  console.error("");
  console.error("Buzzard API is not live on Render.");
  console.error("One-time setup (no GitHub secret required):");
  console.error(SETUP_URL);
  console.error("");
  console.error("Or set GitHub secret RENDER_API_KEY and run workflow 'Setup Render API'.");
}

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

      const routing = response.headers.get("x-render-routing");
      if (fastFailNoServer && response.status === 404 && routing === "no-server") {
        console.error("Render reports no-server — buzzard-api was never provisioned.");
        printSetupHelp();
        if (allowUnprovisioned) {
          console.warn("ALLOW_UNPROVISIONED=1 — continuing without live API.");
          return;
        }
        process.exit(1);
      }

      console.log(`Health pending (${response.status}) attempt ${attempt}…`);
    } catch (error) {
      console.log(`Health pending attempt ${attempt}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(15000, 5000 + attempt * 1000)));
  }

  console.error(`Timed out waiting for ${healthUrl}`);
  printSetupHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
