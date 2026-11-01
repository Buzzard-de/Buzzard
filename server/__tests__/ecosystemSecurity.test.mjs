import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { createMessenger } = require("../lib/security/secureMessaging.js");
const { generateIdentity } = require("../lib/security/e2eBox.js");
const { evaluateDevice } = require("../lib/security/deviceStandard.js");
const { assertIndependentRuntime } = require("../lib/ai/independentCapabilities.js");
const { executeWithProvider } = require("../lib/aiProviders.js");
const { discloseIdentity, reviewAutomatedDecision } = require("../lib/privacy/legalDisclosure.js");
const { campaignDraft } = require("../lib/marketing/influencerIdentities.js");
const { assessVoice } = require("../lib/voice/voiceReadiness.js");

describe("ecosystem security, privacy, voice, marketing", () => {
  it("denies classified egress off the allowlist", () => {
    const denied = evaluateEgress({
      destinationUrl: "https://evil.example/collect",
      payload: { email: "a@b.c", customerId: "1" },
    });
    expect(denied.allowed).toBe(false);
    const allowed = evaluateEgress({
      destinationUrl: "https://buzzard-api.onrender.com/api/health",
      payload: { ping: true },
    });
    expect(allowed.allowed).toBe(true);
  });

  it("refuses messaging without an HMAC secret", () => {
    const bare = createMessenger({});
    expect(bare.send({ fromId: "pusat", toId: "dogu_bey", text: "x", classification: "shared" }).code).toBe(
      "HMAC_SECRET_REQUIRED"
    );
  });

  it("signs internal messages and refuses personal cross-share", () => {
    const bus = createMessenger({ secret: "test-secret" });
    const ok = bus.send({ fromId: "pusat", toId: "dogu_bey", text: "brief", classification: "shared" });
    expect(ok.ok).toBe(true);
    expect(ok.e2e).toBe(false);
    expect(bus.verify(ok.message)).toBe(true);
    const denied = bus.send({ fromId: "textile_ai", toId: "electronics_ai", text: "secret", classification: "personal" });
    expect(denied.code).toBe("SHARE_DENIED");
  });

  it("archives E2E ciphertext only and decrypts with recipient key", () => {
    const alice = generateIdentity();
    const bob = generateIdentity();
    const bus = createMessenger({ secret: "test-secret" });
    const sent = bus.send({
      fromId: "pusat",
      toId: "dogu_bey",
      text: "secret-brief",
      classification: "shared",
      senderPrivateKey: alice.privateKey,
      recipientPublicKey: bob.publicKey,
    });
    expect(sent.e2e).toBe(true);
    expect(sent.message.text).toBeNull();
    expect(JSON.stringify(bus.archive()[0])).not.toContain("secret-brief");
    expect(bus.decrypt(sent.message, bob.privateKey, alice.publicKey).text).toBe("secret-brief");
  });

  it("blocks Claude/external production providers", async () => {
    expect(assertIndependentRuntime("claude").code).toBe("EXTERNAL_AI_FORBIDDEN");
    const result = await executeWithProvider({ provider: "anthropic", prompt: "hi" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("EXTERNAL_AI_FORBIDDEN");
  });

  it("requires AI disclosure and human legal sign-off", () => {
    expect(discloseIdentity({ locale: "de" }).toLowerCase()).toContain("ki");
    expect(reviewAutomatedDecision({ decisionType: "legal", impact: "high" }).canFinalize).toBe(false);
  });

  it("keeps marketing identities synthetic and unpublished", () => {
    const draft = campaignDraft({ identityId: "bz_influencer_f", channel: "instagram", brief: "launch" });
    expect(draft.identity.realPerson).toBe(false);
    expect(draft.publishAllowed).toBe(false);
  });

  it("marks voice BLOCKED without telephony secrets", () => {
    expect(assessVoice().status).toBe("BLOCKED");
    expect(assessVoice().liveCalls).toBe(false);
  });

  it("does not invent unsupported biometrics", () => {
    const report = evaluateDevice({
      full_disk_encryption: true,
      strong_pin_or_password: true,
      mfa: true,
      recovery_keys_in_vault: true,
      remote_lock: true,
      cryptographic_wipe_not_physical_destruction: true,
      session_audit: true,
      backup_restore_test: true,
      unsupportedBiometricClaimed: false,
    });
    expect(report.ok).toBe(true);
    expect(report.biometricClaimed).toBe(false);
  });
});
