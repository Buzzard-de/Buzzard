/**
 * Optional helper for operator scripts. Does not rewrite smoke scripts that
 * target localhost (private IPs are denied by Egress 4.4 — policy unchanged).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { guardedFetch } = require(path.join(root, "server/lib/security/egressGuard.js"));

export async function guardedScriptFetch(destinationUrl, init = {}) {
  const gated = await guardedFetch(destinationUrl, init);
  if (gated.blocked) {
    const err = new Error(gated.decision?.code || "EGRESS_DENIED");
    err.blocked = true;
    err.reachedNetwork = false;
    err.decision = gated.decision;
    throw err;
  }
  return gated.response;
}
