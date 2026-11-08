import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const { list, isHumanOnly } = require("../lib/buzzardNative/platform/humanRemaining.js");
const { board } = require("../lib/buzzardNative/platform/closeoutBoard.js");
const { writeProfile } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { denyGate } = require("../lib/buzzardNative/platform/councilOps.js");
const { cloneAttempt } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Sinan agent-side closeout", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("lists only human remaining work and keeps clone/sales/egress locked", () => {
    const h = list();
    expect(h.count).toBeGreaterThanOrEqual(16);
    expect(isHumanOnly("GIT_PUSH")).toBe(true);
    expect(isHumanOnly("CLONE_OFFICIAL_VOICE")).toBe(true);
    expect(cloneAttempt({ requested: true }).code).toBe("CLONE_DENIED");
    expect(denyGate("GIT_PUSH").executed).toBe(false);
    expect(denyGate("CLONE_OFFICIAL_VOICE").code).toBe("HUMAN_GATE_REQUIRED");
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(isSalesEnabled()).toBe(false);
    const b = board();
    expect(b.agentSideComplete).toBe(true);
    expect(b.liveVerified).toBe(false);
    expect(b.productionReady).toBe(false);
    expect(b.officialVoice.unchanged).toBe(true);
    expect(b.egressOpenai).toBe(false);
    expect(b.thinkingProof.llmCompleted).toBe(false);
    expect(createHash("sha256").update(readFileSync("public/council/sinan-bey-official-voice-v1.m4a")).digest("hex")).toBe(
      "16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d",
    );
  });

  it("cannot persist cloneAuthorized true via writeProfile", () => {
    const dir = mkdtempSync(join(tmpdir(), "sinan-prof-"));
    const r = writeProfile({ cloneAuthorized: true, ttsReady: true, voiceId: "x" }, { actorId: "sinan_bey", root: dir });
    expect(r.cloneAuthorized).toBe(false);
    const saved = JSON.parse(readFileSync(join(dir, "docs/council/sinan_bey_official_voice_profile.json"), "utf8"));
    expect(saved.cloneAuthorized).toBe(false);
    expect(saved.ttsReady).toBe(false);
  });

  it("Pusat closeout and human remaining", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const rem = pusat.executeReadOnly("SINAN_HUMAN_REMAINING", {}, { actorId: "sinan_bey" });
    expect(rem.data.count).toBeGreaterThanOrEqual(16);
    const c = pusat.executeReadOnly("SINAN_CLOSEOUT", {}, { actorId: "pusat" });
    expect(c.data.agentSideComplete).toBe(true);
    expect(c.data.clone.code).toBe("CLONE_DENIED");
    expect(pusat.executeReadOnly("SINAN_CLOSEOUT", {}, { actorId: "stranger" }).data.code).toBe("UNAUTHORIZED_ACTOR");
  });
});
