import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createSinanBeyAgent } = require("../lib/pusat/sinanBeyAgent.js");
const { catalog } = require("../lib/buzzardNative/motors.js");
const { supervisorStatus } = require("../lib/buzzardNative/supervisor.js");
const { costModel } = require("../lib/buzzardNative/costModel.js");
const { dependencyInventory } = require("../lib/buzzardNative/dependencyInventory.js");
const { db } = require("../lib/db.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Sinan Bey native AI program", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    delete process.env.BUZZARD_SINAN_MEMORY_KEY;
  });

  it("keeps motors CODE_READY without weights or external APIs", () => {
    const motors = catalog();
    expect(Object.keys(motors)).toHaveLength(8);
    expect(Object.values(motors).every((m) => m.externalApi === false)).toBe(true);
    expect(Object.values(motors).every((m) => m.pretrainedWeightsPresent === false)).toBe(true);
    expect(Object.values(motors).every((m) => m.liveVerified === false)).toBe(true);
    expect(motors.speech.liveTts).toBe(false);
    expect(motors.hearing.liveStt).toBe(false);
    expect(motors.digital_body.avatarLocked).toBe("/council/sinan-bey.png");
    expect(supervisorStatus().running).toBe(false);
    expect(costModel().measured).toBe(false);
    expect(dependencyInventory().newAiProviderAddedThisRun).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });

  it("versions partitioned memory and encrypts when a key is present", () => {
    const agent = createSinanBeyAgent({ db });
    const a = agent.remember({ section: "C", key: "monolith", value: "keep-modular-monolith", source: "directive" });
    expect(a.ok).toBe(true);
    expect(a.version).toBeGreaterThanOrEqual(1);
    expect(a.encryption).toBe("UNCONFIGURED");
    process.env.BUZZARD_SINAN_MEMORY_KEY = "test-only-not-a-production-secret";
    const b = agent.remember({ section: "C", key: "monolith", value: "still-monolith", source: "directive" });
    expect(b.encryption).toBe("AES-256-GCM");
    const rows = agent.durable.listPartition("C");
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("exposes new Pusat actions and still denies live AI egress", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    expect(pusat.executeReadOnly("SINAN_STATUS", {}, { actorId: "pusat" }).data.alwaysOn).toBe(false);
    expect(pusat.executeReadOnly("SINAN_ARCHITECTURE", {}, { actorId: "pusat" }).data.liveVerified).toBe(false);
    const sec = pusat.executeReadOnly("SINAN_SECURITY_REVIEW", {}, { actorId: "sinan_bey" });
    expect(sec.data.egressDefaultDeny).toBe(true);
    const review = pusat.executeReadOnly("SINAN_REVIEW", { domain: "egress_security" }, { actorId: "sinan_bey" });
    expect(review.data.analysis.ok).toBe(true);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } }).allowed).toBe(
      false,
    );
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1", payload: { source: true } }).allowed).toBe(
      false,
    );
  });
});
