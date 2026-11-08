import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const { AGENTS, ids, getAgent, assignVoice, assignAvatar, impersonate } = require("../lib/buzzardNative/core/identityRegistry.js");
const { forAgent, canUse } = require("../lib/buzzardNative/core/capabilityRegistry.js");
const { check, selfElevate } = require("../lib/buzzardNative/core/permissionEngine.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { createAgentBus } = require("../lib/buzzardNative/core/agentBus.js");
const { think } = require("../lib/buzzardNative/core/sharedThinking.js");
const { speak } = require("../lib/buzzardNative/core/sharedSpeech.js");
const { openSession, listen, crossListen } = require("../lib/buzzardNative/core/sharedHearing.js");
const { analyze } = require("../lib/buzzardNative/core/sharedVision.js");
const { bodyOf, mixAvatars } = require("../lib/buzzardNative/core/bodyMotion.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { openMeeting } = require("../lib/buzzardNative/core/councilSession.js");
const { createAudit } = require("../lib/buzzardNative/core/audit.js");
const { runFoundation } = require("../lib/buzzardNative/core/foundation.js");
const { cloneAttempt, EXPECTED_SHA } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { MEMBERS } = require("../lib/pusat/council.js");

describe("Buzzard Native AI Core — Multi-Agent Foundation", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("A identity: eight registered agents, frozen council MEMBERS untouched", () => {
    expect(ids()).toEqual([
      "pusat",
      "sinan_bey",
      "esat_bey",
      "dogu_bey",
      "nedim_bey",
      "tuncay_bey",
      "amelia",
      "adrian",
      "mira",
      "leon",
    ]);
    expect(getAgent("nedim_bey").display_name).toBe("Nedim Bey");
    expect(getAgent("tuncay_bey").display_name).toBe("Tuncay Bey");
    expect(getAgent("sinan_bey").role).toBe("chief_software_architect");
    expect(getAgent("esat_bey").role).toBe("cyber_security_guardian");
    expect(getAgent("dogu_bey").role).toBe("research_intelligence");
    expect(getAgent("pusat").role).toBe("central_orchestrator");
    expect(getAgent("amelia").display_name).toBe("Amelia");
    expect(getAgent("adrian").display_name).toBe("Adrian");
    expect(getAgent("mira").display_name).toBe("Mira");
    expect(getAgent("leon").display_name).toBe("Leon");
    expect(assignVoice({ fromId: "sinan_bey", toId: "amelia" }).code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    expect(assignAvatar({ fromId: "amelia", toId: "mira" }).code).toBe("AVATAR_CROSS_IDENTITY_DENIED");
    expect(impersonate({ actorId: "leon", asId: "sinan_bey" }).code).toBe("IMPERSONATION_DENIED");
    expect(MEMBERS.some((m) => m.id === "nesrin_hanim")).toBe(true);
    expect(MEMBERS.some((m) => m.id === "amelia")).toBe(false);
    expect(getAgent("sinan_bey").voice_profile.cloneAuthorized).toBe(false);
    expect(getAgent("amelia").voice_profile.status).toBe("NOT_CONFIGURED");
    expect(getAgent("amelia").avatar_profile.status).toBe("NOT_CONFIGURED");
  });

  it("B memory isolation, integrity, restore", () => {
    const mem = createMultiMemory();
    expect(mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "k", value: "secret" }).ok).toBe(true);
    expect(mem.get({ actorId: "esat_bey", ownerId: "sinan_bey", type: "personal", key: "k" }).code).toBe("MEMORY_ISOLATION_DENIED");
    expect(mem.get({ actorId: "amelia", ownerId: "mira", type: "personal", key: "k" }).code).toBe("MEMORY_ISOLATION_DENIED");
    expect(mem.get({ actorId: "pusat", ownerId: "sinan_bey", type: "personal", key: "k" }).code).toBe("MEMORY_ISOLATION_DENIED");
    mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "k", value: "v2" });
    expect(mem.restore({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "k", version: 1 }).value).toBe("secret");
    expect(mem.tamperDetect({ ownerId: "sinan_bey", type: "personal", key: "k" }).detected).toBe(true);
    expect(mem.get({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "k" }).intact).toBe(true);
  });

  it("C shared engines keep identity context", () => {
    const a = think({ agentId: "sinan_bey", facts: { ask_expertise: true } });
    const b = think({ agentId: "esat_bey", facts: { ask_expertise: true } });
    expect(a.kind).toBe("RULE_BASED");
    expect(a.llmCompleted).toBe(false);
    expect(a.expertise[0]).toBe("software_architecture");
    expect(b.expertise[0]).toBe("security_audit");
    expect(speak({ agentId: "sinan_bey", text: "a" }).mixedWithSinan).toBe(false);
    expect(speak({ agentId: "amelia", text: "a" }).voiceStatus).toBe("NOT_CONFIGURED");
    expect(speak({ agentId: "amelia", text: "a" }).cloneAuthorized).toBe(false);
    const sess = openSession({ agentId: "sinan_bey" });
    expect(listen({ sessionId: sess.sessionId }).transcribe).toBe("NOT_IMPLEMENTED");
    expect(crossListen({ sessionId: sess.sessionId, otherAgentId: "amelia" }).code).toBe("HEARING_SESSION_ISOLATION_DENIED");
    expect(analyze({ agentId: "amelia" }).code).toBe("CAPABILITY_DENIED");
    expect(analyze({ agentId: "sinan_bey", op: "understand" }).code).toBe("NOT_IMPLEMENTED");
    expect(canUse("amelia", "vision")).toBe(false);
    expect(canUse("sinan_bey", "thinking")).toBe(true);
    expect(forAgent("sinan_bey").find((c) => c.engine === "speech").active).toBe(false);
    expect(bodyOf("sinan_bey").is3d).toBe(false);
    expect(bodyOf("sinan_bey").lipSync).toBe("NOT_IMPLEMENTED");
    expect(mixAvatars("mira", "leon").code).toBe("AVATAR_CROSS_IDENTITY_DENIED");
  });

  it("D agent bus integrity and Pusat collection", () => {
    const bus = createAgentBus();
    const ok = bus.send({ sender: "sinan_bey", receiver: "esat_bey", type: "report", taskId: "t1", body: "ok" });
    expect(ok.ok).toBe(true);
    expect(ok.message.liveNetwork).toBe(false);
    expect(bus.send({ sender: "sinan_bey", receiver: "esat_bey", type: "report", taskId: "t1", body: "ok" }).code).toBe(
      "DUPLICATE_MESSAGE",
    );
    expect(bus.send({ sender: "ghost", receiver: "sinan_bey", type: "x" }).code).toBe("UNKNOWN_AGENT");
    expect(bus.send({ sender: "sinan_bey", receiver: "mira", type: "note", permission_scope: "personal_memory" }).code).toBe(
      "PRIVATE_MEMORY_TRANSFER_DENIED",
    );
    const router = createRouter();
    const t = router.create({ title: "research payments" });
    router.assign({ taskId: t.task.id, agentId: "dogu_bey" });
    router.assign({ taskId: t.task.id, agentId: "sinan_bey" });
    router.assign({ taskId: t.task.id, agentId: "esat_bey" });
    const ran = router.runAssigned(t.task.id);
    expect(ran.task.reports).toHaveLength(3);
    expect(ran.completed).toBe(false);
    expect(ran.task.state).toBe("APPROVAL_REQUIRED");
    expect(router.forceComplete().code).toBe("HUMAN_GATE_REQUIRED");
    const r2 = createRouter({ seed: router.snapshot() });
    expect(r2.get(t.task.id).reports).toHaveLength(3);
  });

  it("E permissions technically deny dangerous and self-elevate", () => {
    expect(check("sinan_bey", "DEPLOY").ok).toBe(false);
    expect(check("esat_bey", "SECURITY_POLICY_CHANGE").ok).toBe(false);
    expect(check("pusat", "PAYMENT_ACTIVATE").ok).toBe(false);
    expect(check("mira", "DATA_EXPORT").ok).toBe(false);
    expect(selfElevate("leon", "GIT_PUSH").code).toBe("SELF_ELEVATION_DENIED");
    expect(check("amelia", "ASSIGN_TASK").ok).toBe(false);
  });

  it("F resilience, meeting honesty, audit redaction, clone/egress", () => {
    const f = runFoundation({ actorId: "sinan_bey" });
    expect(f.isolationCrash.thinkingCrashed).toBe(true);
    expect(f.isolationCrash.hearingOk).toBe(true);
    expect(f.persistOk).toBe(true);
    expect(f.meeting.attendance.amelia).toBe(false);
    expect(f.meeting.liveVoice).toBe(false);
    expect(f.auditRedacted).toBe(true);
    expect(f.clone.code).toBe("CLONE_DENIED");
    expect(f.egress).toBe(false);
    expect(f.liveVerified).toBe(false);
    expect(f.productionReady).toBe(false);
    expect(f.singlePercentComplete).toBe(null);
    expect(f.hearingHumanStt).toBe("NOT_IMPLEMENTED");
    expect(f.official.unchanged).toBe(true);
    expect(f.load.eightParallelNativeThreads).toBe(false);
    expect(f.load.sufficientForEightLlm).toBe(false);
    expect(runFoundation({ actorId: "stranger" }).code).toBe("UNAUTHORIZED_ACTOR");
    const aud = createAudit();
    aud.log("x", { api_key: "abc", agentId: "sinan_bey" });
    expect(aud.all()[0].payload.api_key).toBe("[REDACTED]");
    const meet = openMeeting({ present: ["pusat"] });
    expect(meet.attendance.sinan_bey).toBe(false);
  });

  it("G classification: in-process not live; official hash; Pusat action", () => {
    const sha = createHash("sha256").update(readFileSync("public/council/sinan-bey-official-voice-v1.m4a")).digest("hex");
    expect(sha).toBe(EXPECTED_SHA);
    expect(cloneAttempt({ requested: true }).cloneAuthorized).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(existsSync("public/council/sinan-bey.png")).toBe(true);
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const r = pusat.executeReadOnly("MULTI_AGENT_FOUNDATION", {}, { actorId: "pusat" });
    expect(r.data.registered).toBe(10);
    expect(r.data.orchestrator.completed).toBe(false);
    expect(AGENTS).toHaveLength(10);
  });
});
