import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { createIsolatedHttp } = require(path.join(root, "server/lib/security/isolatedHttpHarness.js"));

const harness = createIsolatedHttp({
  fixtures: {
    "/api/db/status": { status: 200, body: { storage: "sqlite", live: false } },
    "/api/health": { status: 200, body: { ok: true, live: false } },
    "/api/cart": { status: 200, body: { items: [] } },
  },
});

export async function isolatedRequest(url, options = {}) {
  const parsed = new URL(url, "buzzard-isolated://smoke");
  const dest =
    parsed.protocol === "http:" || parsed.protocol === "https:"
      ? `buzzard-isolated://${parsed.host}${parsed.pathname}`
      : url;
  const result = await harness.request(dest, options);
  return {
    status: result.status || 0,
    ok: Boolean(result.ok),
    body: result.body,
    isolated: true,
    reachedNetwork: false,
  };
}
