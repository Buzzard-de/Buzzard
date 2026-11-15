/**
 * Shared smoke HTTP. Default = isolated mock. Never a production localhost allow.
 * BUZZARD_LIVE_SMOKE=1 is denied when APP_ENV/NODE_ENV is production.
 */
const { createIsolatedHttp } = require("./isolatedHttpHarness");

function isProductionRuntime({ env = process.env } = {}) {
  const app = String(env.APP_ENV || "").toLowerCase();
  const node = String(env.NODE_ENV || "").toLowerCase();
  return app === "production" || node === "production" || env.BUZZARD_PRODUCTION === "1";
}

function liveSmokeAllowed({ env = process.env } = {}) {
  if (env.BUZZARD_LIVE_SMOKE !== "1") return false;
  if (isProductionRuntime({ env })) return false;
  return true;
}

const harness = createIsolatedHttp({
  fixtures: {
    "/api/db/status": { status: 200, body: { storage: "sqlite", live: false } },
    "/api/health": { status: 200, body: { ok: true, live: false } },
    "/api/health/db": { status: 200, body: { ok: true, live: false } },
    "/api/health/production": { status: 200, body: { sales: false, live: false } },
    "/api/cart": { status: 200, body: { items: [] } },
    "/api/orders": { status: 200, body: [] },
    "/api/localization/feed/google.xml": { status: 200, body: "<rss/>" },
    "/sitemap.xml": { status: 200, body: "<urlset/>" },
    "/robots.txt": { status: 200, body: "User-agent: *" },
    "/en/": { status: 200, body: "<html lang=en>" },
    "/tr/": { status: 200, body: "<html lang=tr>" },
    "/ar/": { status: 200, body: "<html lang=ar dir=rtl>" },
  },
});

async function smokeFetch(url, init = {}, { env = process.env } = {}) {
  if (env.BUZZARD_LIVE_SMOKE === "1" && isProductionRuntime({ env })) {
    const err = new Error("LIVE_SMOKE_DENIED_IN_PRODUCTION");
    err.code = "LIVE_SMOKE_DENIED_IN_PRODUCTION";
    err.reachedNetwork = false;
    throw err;
  }
  if (liveSmokeAllowed({ env })) {
    const err = new Error("LIVE_SMOKE_NOT_USED_IN_DEFAULT_HARNESS");
    err.code = "LIVE_SMOKE_LAB_ONLY";
    err.reachedNetwork = false;
    err.note = "Lab live smoke remains an operator tool; default tests stay isolated.";
    throw err;
  }
  let pathname = "/";
  try {
    const parsed = new URL(url, "buzzard-isolated://smoke");
    pathname = parsed.pathname || "/";
  } catch {
    pathname = String(url || "/");
  }
  const result = await harness.request(`buzzard-isolated://smoke${pathname}`, init);
  return {
    ok: Boolean(result.ok),
    status: result.status || 0,
    statusText: result.ok ? "OK" : "ISOLATED",
    reachedNetwork: false,
    isolated: true,
    async text() {
      return typeof result.body === "string" ? result.body : JSON.stringify(result.body ?? {});
    },
    async json() {
      if (result.body && typeof result.body === "object") return result.body;
      try {
        return JSON.parse(String(result.body || "{}"));
      } catch {
        return {};
      }
    },
  };
}

module.exports = { smokeFetch, isProductionRuntime, liveSmokeAllowed };
