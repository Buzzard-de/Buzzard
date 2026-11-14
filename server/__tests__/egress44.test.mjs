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
  FAIL_CLOSED,
  unwrapIpv4Mapped,
  policyFingerprint,
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

  it("fail-closed policy has empty allowlist and DENY default", () => {
    expect(FAIL_CLOSED.default).toBe("DENY");
    expect(FAIL_CLOSED.allowlist).toEqual([]);
    expect(FAIL_CLOSED.note).toBe("POLICY_UNREADABLE_FAIL_CLOSED");
  });

  it("loads the shared policy used by Node and Python", () => {
    expect(SHARED.default).toBe("DENY");
    expect(SHARED.default).toBe("DENY");
    expect(SHARED.allowlist).not.toContain("buzzard24.de");
    expect(SHARED.deniedHosts).toContain("buzzard24.de");
    expect(SHARED.forbiddenAiHosts).toContain("api.openai.com");
    const py = readFileSync(path.join(process.cwd(), "intelligence/security/egress_policy.py"), "utf8");
    expect(py).toMatch(/egress_policy\.v1\.json/);
  });

  it("denies multicast, broadcast, and resolved private IPs", () => {
    expect(evaluateEgress({ destinationUrl: "https://224.0.0.1/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateResolvedAddresses(["169.254.169.254"], "buzzard24.de").code).toBe("RESOLVED_IP_DENIED");
    expect(evaluateResolvedAddresses(["203.0.113.8"], "buzzard24.de").allowed).toBe(true);
  });

  it("treats IPv4-mapped IPv6 as the inner IPv4 for private/metadata checks", () => {
    expect(unwrapIpv4Mapped("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(evaluateEgress({ destinationUrl: "https://[::ffff:127.0.0.1]/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://[::ffff:169.254.169.254]/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(policyFingerprint()).toMatch(/^[a-f0-9]{64}$/);
    expect(SHARED.allowlist).not.toContain("api.ebay.com");
    expect(SHARED.allowlist).not.toContain("api.stripe.com");
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
    const hop = await guardedFetch("https://buzzard-api.onrender.com/rebind", {}, { ping: true });
    expect(hop.blocked).toBe(true);
    expect(hop.reachedNetwork).toBe(false);
    expect(hop.decision.code).toBe("RESOLVED_IP_DENIED");
  });

  it("does not resolve or fetch a denied storefront host", async () => {
    const original = globalThis.fetch;
    let fetched = false;
    let lookedUp = false;
    globalThis.fetch = async () => {
      fetched = true;
      throw new Error("fetch must not run");
    };
    setDnsLookup(async () => {
      lookedUp = true;
      return [{ address: "203.0.113.8" }];
    });
    try {
      const hop = await guardedFetch("https://buzzard24.de/rebind", {}, { customerId: "customer-test" });
      expect(hop.blocked).toBe(true);
      expect(hop.reachedNetwork).toBe(false);
      expect(hop.decision.code).toBe("EGRESS_DENIED");
      expect(fetched).toBe(false);
      expect(lookedUp).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
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

  it("default deny and payment/AI hosts stay locked", () => {
    expect(evaluateEgress({ destinationUrl: "https://evil.example/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.stripe.com/v1" }).code).toBe("PAYMENT_EGRESS_LOCKED");
    expect(evaluateEgress({ destinationUrl: "https://api-m.paypal.com/v1" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://10.0.0.8/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://[fd00::1]/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://[::ffff:10.1.2.3]/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://169.254.169.254/latest/meta-data/" }).code).toBe(
      "PRIVATE_OR_IP_DENIED"
    );
  });

  it("does not treat wildcard extra hosts as an allowlist bypass", () => {
    process.env.BUZZARD_EGRESS_EXTRA_HOSTS = "*.evil.com,*.stripe.com";
    expect(extraHosts()).toEqual([]);
    expect(evaluateEgress({ destinationUrl: "https://a.evil.com/" }).allowed).toBe(false);
  });

  it("denies browser connect for cross-origin AI and metadata", () => {
    expect(evaluateBrowserConnect("https://api.openai.com/v1").allowed).toBe(false);
    expect(evaluateBrowserConnect("https://169.254.169.254/").allowed).toBe(false);
    expect(evaluateBrowserConnect("https://127.0.0.1.nip.io/").code).toBe("BROWSER_REBIND_DENIED");
    expect(evaluateBrowserConnect("https://buzzard24.de/api/health").allowed).toBe(true);
  });

  it("denies browser telemetry and AI unless IDs are explicitly set", () => {
    expect(evaluateBrowserConnect("https://www.google-analytics.com/g/collect").code).toBe("BROWSER_TELEMETRY_OFF");
    process.env.NEXT_PUBLIC_GA4_ID = "G-TEST";
    expect(evaluateBrowserConnect("https://www.google-analytics.com/g/collect").code).toBe("THIRD_PARTY_ANALYTICS");
    expect(evaluateBrowserConnect("https://api.anthropic.com/v1").allowed).toBe(false);
  });
});
