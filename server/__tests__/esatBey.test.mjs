import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const esat = require("../lib/security/esatBey.js");
const { guardedFetch, resetEgressAudit } = require("../lib/security/egressGuard.js");
const { createMessenger } = require("../lib/security/secureMessaging.js");
const { screenCompliance } = require("../lib/commerce/sanctionsScreen.js");
const runtime = require("../lib/pusat/runtime.js");

describe("Esat Bey defensive monitor", () => {
  afterEach(() => {
    esat.resetEsat();
    resetEgressAudit();
  });

  it("isolates credential theft and does not claim sole defense", () => {
    const verdict = esat.inspect({ type: "credential_exfiltration", details: { path: "/tmp" } });
    expect(verdict.allowed).toBe(false);
    expect(verdict.hold).toBe(true);
    expect(verdict.action).toBe("ISOLATE_AND_HOLD");
    expect(esat.status().soleDefense).toBe(false);
    expect(esat.status().completeClaim).toBe(false);
    expect(esat.status().active).toBe(true);
    expect(esat.recent(1)[0].details.path).toBe("/tmp");
  });

  it("blocks secret-bearing council messages", () => {
    const bus = createMessenger({ secret: "test-secret" });
    const held = bus.send({
      fromId: "pusat",
      toId: "dogu_bey",
      text: "here is a private key dump",
      classification: "shared",
    });
    expect(held.ok).toBe(false);
    expect(held.code).toBe("ESAT_HOLD");
    expect(held.esat.hits).toContain("private key");
    const denied = bus.send({
      fromId: "textile_ai",
      toId: "electronics_ai",
      text: "ok",
      classification: "personal",
    });
    expect(denied.code).toBe("SHARE_DENIED");
    expect(denied.esat.reviewer).toBe("esat_bey");
  });

  it("records blocked AI and payment egress without reaching the network", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network must not run");
    };
    try {
      const ai = await guardedFetch("https://api.anthropic.com/v1/messages", {}, { ping: true });
      expect(ai.reachedNetwork).toBe(false);
      expect(ai.esat.hold).toBe(true);
      expect(ai.esat.type || ai.esat.action).toBeDefined();
      const pay = await guardedFetch("https://api.stripe.com/v1/charges", {}, { paymentMethod: "card" });
      expect(pay.esat.hold).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
    expect(esat.recent().some((e) => e.type === "EXTERNAL_AI_EGRESS_DENIED")).toBe(true);
    expect(esat.recent().some((e) => e.type === "PAYMENT_EGRESS")).toBe(true);
  });

  it("sits on sanctions holds and stays callable when Pusat is off", () => {
    const hold = screenCompliance({ destination: "FR", value: 10, dualUse: true });
    expect(hold.esat.hold).toBe(true);
    const prev = process.env.PUSAT_RUNTIME_ENABLED;
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const status = runtime.executeReadOnly("ESAT_STATUS");
    expect(status.ok).toBe(true);
    expect(status.data.active).toBe(true);
    const ping = runtime.executeReadOnly("PING");
    expect(ping.code).toBe("PUSAT_DISABLED");
    if (prev === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
    else process.env.PUSAT_RUNTIME_ENABLED = prev;
  });
});
