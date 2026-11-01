import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  evaluateEgress,
  extraHosts,
  isPrivateOrLocalHost,
} = require("../lib/security/egressPolicy.js");
const { guardedFetch, resetEgressAudit } = require("../lib/security/egressGuard.js");

describe("egress 4.2 supplier and SSRF locks", () => {
  afterEach(() => {
    resetEgressAudit();
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
  });

  it("allows only https allowlisted hosts on port 443", () => {
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de/api" }).allowed).toBe(true);
    expect(evaluateEgress({ destinationUrl: "http://buzzard24.de/api" }).code).toBe("HTTPS_REQUIRED");
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de:8443/api" }).code).toBe("PORT_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://user:pass@buzzard24.de/" }).code).toBe("URL_USERINFO_DENIED");
  });

  it("denies loopback, private, link-local, metadata, and IP literals", () => {
    expect(isPrivateOrLocalHost("127.0.0.1")).toBe(true);
    expect(evaluateEgress({ destinationUrl: "https://127.0.0.1/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://192.168.1.9/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://10.0.0.8/" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://169.254.169.254/latest/meta-data" }).code).toBe(
      "PRIVATE_OR_IP_DENIED"
    );
    expect(evaluateEgress({ destinationUrl: "https://localhost/admin" }).code).toBe("PRIVATE_OR_IP_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://[::1]/" }).allowed).toBe(false);
  });

  it("does not follow redirects to forbidden hosts", async () => {
    const original = globalThis.fetch;
    let second = false;
    globalThis.fetch = async (url) => {
      if (String(url).includes("anthropic")) {
        second = true;
        throw new Error("redirect must not be followed");
      }
      return {
        status: 302,
        ok: false,
        headers: { get: (name) => (name === "location" ? "https://api.anthropic.com/v1" : null) },
      };
    };
    try {
      const hop = await guardedFetch("https://buzzard24.de/out", {}, { ping: true });
      expect(hop.blocked).toBe(true);
      expect(hop.followedRedirect).toBe(false);
      expect(hop.decision.code).toBe("REDIRECT_DENIED");
      expect(second).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("keeps AI and payment locked through EXTRA_HOSTS, proxy env, and wildcards", () => {
    process.env.HTTP_PROXY = "http://proxy.internal:8080";
    process.env.BUZZARD_EGRESS_EXTRA_HOSTS = "*.openai.com,api.openai.com,api.stripe.com,*.evil.com,helper.example";
    expect(extraHosts()).toEqual(["helper.example"]);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.stripe.com/v1" }).code).toBe("PAYMENT_EGRESS_LOCKED");
  });
});
