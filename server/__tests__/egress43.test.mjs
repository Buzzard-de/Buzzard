import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateEgress, isRebindLookalike } = require("../lib/security/egressPolicy.js");
const { evaluateBrowserConnect } = require("../../lib/security/browserConnect.js");
const { guardedFetch, resetEgressAudit, setDnsLookup } = require("../lib/security/egressGuard.js");

function walkJs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "exports") continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkJs(full, acc);
    else if (/\.(js|mjs|cjs)$/.test(name)) acc.push(full);
  }
  return acc;
}

describe("egress 4.3 browser vs server", () => {
  afterEach(() => {
    resetEgressAudit();
    setDnsLookup(null);
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    delete process.env.HTTP_PROXY;
  });

  it("denies DNS-rebinding lookalikes and IPv6 literals on the server", () => {
    expect(isRebindLookalike("127.0.0.1.nip.io")).toBe(true);
    expect(evaluateEgress({ destinationUrl: "https://127.0.0.1.nip.io/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://evil.localhost.example/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://metadata.google.internal/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://169.254.169.254/latest/meta-data" }).code).toBe(
      "PRIVATE_OR_IP_DENIED"
    );
    expect(evaluateEgress({ destinationUrl: "https://[fe80::1]/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://[2001:db8::1]/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://[::1]/" }).allowed).toBe(false);
  });

  it("applies a separate browser policy that still blocks AI, payments, and rebind", () => {
    expect(evaluateBrowserConnect("https://api.openai.com/v1").allowed).toBe(false);
    expect(evaluateBrowserConnect("https://api.anthropic.com/v1").code).toBe("BROWSER_FORBIDDEN_HOST");
    expect(evaluateBrowserConnect("https://api.stripe.com/v1").allowed).toBe(false);
    expect(evaluateBrowserConnect("https://api-m.paypal.com/v2").allowed).toBe(false);
    expect(evaluateBrowserConnect("https://127.0.0.1.nip.io/steal").code).toBe("BROWSER_REBIND_DENIED");
    expect(evaluateBrowserConnect("https://buzzard-api.onrender.com/api/health").allowed).toBe(true);
    expect(evaluateBrowserConnect("/api/health").allowed).toBe(true);
    expect(evaluateBrowserConnect("https://www.google-analytics.com/g/collect").code).toBe("BROWSER_TELEMETRY_OFF");
  });

  it("keeps CSP connect-src free of OpenAI and Stripe", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/security.ts"), "utf8");
    expect(src).not.toMatch(/api\.openai\.com/);
    expect(src).not.toMatch(/api\.stripe\.com/);
    expect(src).not.toMatch(/api\.anthropic\.com/);
    expect(src).toMatch(/connect-src/);
    expect(src).toMatch(/google-analytics/);
  });

  it("has no raw server fetch outside egressGuard", () => {
    const files = walkJs(path.join(process.cwd(), "server"));
    const offenders = [];
    for (const file of files) {
      if (file.endsWith(`${path.sep}egressGuard.js`)) continue;
      if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
      const src = readFileSync(file, "utf8");
      if (/\bfetch\s*\(/.test(src)) offenders.push(path.relative(process.cwd(), file));
    }
    expect(offenders).toEqual([]);
  });

  it("does not follow a 302 to a payment host", async () => {
    const original = globalThis.fetch;
    let followed = false;
    globalThis.fetch = async (url) => {
      if (String(url).includes("stripe")) {
        followed = true;
        throw new Error("redirect must not be followed");
      }
      return {
        status: 302,
        ok: false,
        headers: { get: (name) => (name === "location" ? "https://api.stripe.com/v1/charges" : null) },
      };
    };
    setDnsLookup(async () => [{ address: "203.0.113.10" }]);
    try {
      const hop = await guardedFetch("https://buzzard24.de/pay-out", {}, { ping: true });
      expect(hop.blocked).toBe(true);
      expect(hop.followedRedirect).toBe(false);
      expect(hop.decision.code).toBe("REDIRECT_DENIED");
      expect(followed).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });
});
