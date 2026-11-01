import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../../lib/security.ts";

const require = createRequire(import.meta.url);
const {
  evaluateEgress,
  evaluateResolvedAddresses,
  extraHosts,
  SHARED,
} = require("../lib/security/egressPolicy.js");
const { guardedFetch, resetEgressAudit, setDnsLookup } = require("../lib/security/egressGuard.js");
const { evaluateBrowserConnect } = require("../../lib/security/browserConnect.js");

describe("egress 4.4 multilayer", () => {
  afterEach(() => {
    resetEgressAudit();
    setDnsLookup(null);
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    delete process.env.HTTP_PROXY;
    delete process.env.NEXT_PUBLIC_GA4_ID;
    delete process.env.NEXT_PUBLIC_GTM_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  });

  it("loads the shared policy used by Node and Python", () => {
    expect(SHARED.default).toBe("DENY");
    expect(SHARED.allowlist).toContain("buzzard24.de");
    expect(SHARED.forbiddenAiHosts).toContain("api.openai.com");
    const py = readFileSync(path.join(process.cwd(), "intelligence/security/egress_policy.py"), "utf8");
    expect(py).toMatch(/egress_policy\.v1\.json/);
  });

  it("denies multicast, broadcast, and resolved private IPs", () => {
    expect(evaluateEgress({ destinationUrl: "https://224.0.0.1/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateResolvedAddresses(["169.254.169.254"], "buzzard24.de").code).toBe("RESOLVED_IP_DENIED");
    expect(evaluateResolvedAddresses(["203.0.113.8"], "buzzard24.de").allowed).toBe(true);
  });

  it("does not let proxy env or extra hosts open AI or payments", () => {
    process.env.HTTP_PROXY = "http://127.0.0.1:8080";
    process.env.BUZZARD_EGRESS_EXTRA_HOSTS = "*.openai.com,api.stripe.com,api.ebay.com";
    expect(extraHosts()).toEqual(["api.ebay.com"]);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.stripe.com/v1" }).code).toBe("PAYMENT_EGRESS_LOCKED");
  });

  it("blocks a rebind after DNS flips to metadata", async () => {
    setDnsLookup(async () => [{ address: "169.254.169.254" }]);
    const hop = await guardedFetch("https://buzzard24.de/rebind", {}, { ping: true });
    expect(hop.blocked).toBe(true);
    expect(hop.reachedNetwork).toBe(false);
    expect(hop.decision.code).toBe("RESOLVED_IP_DENIED");
  });

  it("keeps CSP free of telemetry hosts when marketing IDs are empty", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toMatch(/connect-src/);
    expect(csp).not.toMatch(/google-analytics/);
    expect(csp).not.toMatch(/connect\.facebook\.net/);
    expect(csp).not.toMatch(/analytics\.tiktok\.com/);
    expect(csp).not.toMatch(/api\.openai\.com/);
    expect(readFileSync(path.join(process.cwd(), "server/server.js"), "utf8")).not.toMatch(
      /Access-Control-Allow-Origin", "\*"/
    );
  });

  it("denies browser telemetry and AI unless IDs are explicitly set", () => {
    expect(evaluateBrowserConnect("https://www.google-analytics.com/g/collect").code).toBe("BROWSER_TELEMETRY_OFF");
    process.env.NEXT_PUBLIC_GA4_ID = "G-TEST";
    expect(evaluateBrowserConnect("https://www.google-analytics.com/g/collect").code).toBe("THIRD_PARTY_ANALYTICS");
    expect(evaluateBrowserConnect("https://api.anthropic.com/v1").allowed).toBe(false);
  });
});
