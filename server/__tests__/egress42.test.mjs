import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  evaluateEgress,
  extraHosts,
  isPrivateOrLocalHost,
} = require("../lib/security/egressPolicy.js");
const { guardedFetch, resetEgressAudit, setDnsLookup } = require("../lib/security/egressGuard.js");

describe("egress 4.2 supplier and SSRF locks", () => {
  afterEach(() => {
    resetEgressAudit();
    setDnsLookup(null);
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
  });

  it("denies buzzard24.de for https, customer data, and every alias", async () => {
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de/api" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de/api" }).code).toBe("EGRESS_DENIED");
    expect(
      evaluateEgress({ destinationUrl: "https://buzzard24.de/api", payload: { email: "customer@example.test" } }).code,
    ).toBe("EGRESS_DENIED");
    expect(
      evaluateEgress({ destinationUrl: "https://buzzard24.de/api", payload: { customerId: "customer-test" } }).allowed,
    ).toBe(false);
    expect(evaluateEgress({ destinationUrl: "http://buzzard24.de/api" }).code).toBe("HTTPS_REQUIRED");
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de:8443/api" }).code).toBe("PORT_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://user:pass@buzzard24.de/" }).code).toBe("URL_USERINFO_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://www.buzzard24.de/" }).code).toBe("EGRESS_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://shop.buzzard24.de/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://example.com/" }).code).toBe("HOST_NOT_ALLOWLISTED");
    process.env.BUZZARD_EGRESS_EXTRA_HOSTS = "buzzard24.de";
    expect(evaluateEgress({ destinationUrl: "https://buzzard24.de/" }).allowed).toBe(false);

    const original = globalThis.fetch;
    let fetched = false;
    let lookedUp = false;
    globalThis.fetch = async () => {
      fetched = true;
      throw new Error("fetch must not run");
    };
    setDnsLookup(async () => {
      lookedUp = true;
      return [{ address: "203.0.113.10" }];
    });
    try {
      const hop = await guardedFetch(
        "https://buzzard24.de/out",
        {},
        { email: "customer@example.test", customerId: "customer-test" },
      );
      expect(hop.blocked).toBe(true);
      expect(hop.reachedNetwork).toBe(false);
      expect(hop.decision.allowed).toBe(false);
      expect(hop.decision.code).toBe("EGRESS_DENIED");
      expect(fetched).toBe(false);
      expect(lookedUp).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
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
    setDnsLookup(async () => [{ address: "203.0.113.10" }]);
    try {
      const hop = await guardedFetch("https://buzzard-api.onrender.com/out", {}, { ping: true });
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
