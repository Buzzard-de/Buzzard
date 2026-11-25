import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");
const { listDuty, runDuty, brief, gates } = require("../lib/buzzardNative/core/staffRecord.js");
const aslan = require("../lib/buzzardNative/core/aslanBey.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { analyzeOfficialVoice } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const voice = require("../lib/voice/buzzardVoice.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-duty-")), "orch.sqlite");
}

describe("staff completion", () => {
  it("keeps seventeen duty cards on the existing specialists", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const duty = listDuty();
    expect(duty.ok).toBe(true);
    expect(duty.rosterChanged).toBe(false);
    expect(duty.members.map((row) => row.agentId)).toEqual(ids());
    expect(duty.members.find((row) => row.agentId === "sinan_bey").kind).toBe("ANALYZE_CODE");
    expect(duty.members.find((row) => row.agentId === "stock_ai").speech).toBe(false);
    expect(duty.members.find((row) => row.agentId === "pricing_ai").forbidden).toContain("STOCK_BUY");
    const locked = gates();
    expect(locked.banuAssign.ok).toBe(false);
    expect(locked.akinBuy.code).toBe("HUMAN_GATE_REQUIRED");
    expect(locked.stockBuy.code).toBe("HUMAN_GATE_REQUIRED");
    expect(locked.sales).toBe(false);
    const ran = ids().map((id) => runDuty({ agentId: id }));
    expect(ran.every((row) => row.ok && row.model.code === "MODEL_NOT_CONFIGURED" && row.llmCompleted === false)).toBe(true);
    expect(ran.every((row) => row.actionStartedByModel === false)).toBe(true);
    expect(runDuty({ agentId: "stock_ai", speak: true }).voice.code).toBe("CAPABILITY_DENIED");
    const memory = createMultiMemory();
    memory.put({ actorId: "nedim_bey", ownerId: "nedim_bey", type: "personal", key: "note", value: "tax" });
    expect(memory.get({ actorId: "pricing_ai", ownerId: "nedim_bey", type: "personal", key: "note" }).code).toBe("MEMORY_ISOLATION_DENIED");
  });

  it("lets Pusat collect a specialist result without taking the specialty", () => {
    const report = brief({ domain: "security", dbPath: orchDb() });
    expect(report.ok).toBe(true);
    expect(report.from).toBe("pusat");
    expect(report.to).toBe("suleyman_bey");
    expect(report.pusatDidSpecialistWork).toBe(false);
    expect(report.specialists[0].agentId).toBe("esat_bey");
    expect(report.model.code).toBe("MODEL_NOT_CONFIGURED");
    expect(report.salesEnabled).toBe(false);
  });

  it("coordinates research and keeps forensic work static", () => {
    expect(ids().includes("aslan_bey")).toBe(false);
    expect(aslan.IDENTITY.councilMember).toBe(false);
    expect(aslan.IDENTITY.assists).toBe("dogu_bey");
    const open = aslan.coordinate({ topic: "categories", question: "local_only", sources: [] });
    expect(open.report.verification).toBe("UNVERIFIED");
    expect(open.followUp.ok).toBe(true);
    expect(open.subtasks.map((row) => row.owner)).toEqual(["dogu_bey", "aslan_bey", "aslan_bey"]);
    expect(open.pusatSummary.to).toBe("pusat");
    const clash = aslan.coordinate({
      topic: "markets",
      question: "lane",
      sources: [
        { url: "https://example.test/a", retrievedAt: "2026-11-25", claim: "open" },
        { url: "https://example.test/b", retrievedAt: "2026-11-25", claim: "closed" },
      ],
    });
    expect(clash.contradictions[0].values).toEqual(["open", "closed"]);
    expect(aslan.coordinate({ topic: "counterattack" }).code).toBe("OFFENSIVE_ACTION_DENIED");
    const hash = "ab".repeat(32);
    const exam = aslan.examine({
      artifacts: [{
        name: "auth.log",
        system: "lab-web",
        collectedBy: "pusat",
        collectedAt: "2026-11-25T08:00:00Z",
        text: `2026-11-25T07:00:00Z login 203.0.113.10 bad.example ${hash}`,
      }],
    });
    expect(exam.staticOnly).toBe(true);
    expect(exam.executed).toBe(false);
    expect(exam.custody[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(exam.indicators.ips).toContain("203.0.113.10");
    expect(exam.timeline).toHaveLength(1);
    expect(exam.affected).toEqual(["lab-web"]);
    expect(aslan.examine({ action: "pursue" }).code).toBe("OFFENSIVE_ACTION_DENIED");
    const hand = aslan.handToDefense(exam);
    expect(hand.to).toBe("esat_bey");
    expect(hand.offense).toBe(false);
    expect(hand.remoteAccess).toBe(false);
    expect(hand.esat.id).toBe("esat_bey");
  });

  it("keeps calls inside the lab and does not grant speech or a carrier", () => {
    const reference = analyzeOfficialVoice({ actorId: "sinan_bey" });
    expect(reference.profile.referenceFileHash).toMatch(/^[a-f0-9]{64}$/);
    const tts = voice.createTtsEngine();
    const spoken = tts.speak({ agentId: "zeynep_hanim", text: "rapor", lang: "tr" });
    expect(spoken.pose.scannedBody).toBe(false);
    expect(spoken.pose.digitalHuman).toBe(false);
    expect(spoken.pose.frames.length).toBe(spoken.phonemes.length);
    expect(spoken.mouth.mesh).toBe("NOT_CONFIGURED");
    const manager = voice.createCallManager();
    const inbound = manager.receive({ audio: spoken.wav, lang: "tr" });
    expect(inbound.environment).toBe("INTERNAL_LAB");
    expect(inbound.placedOnCarrier).toBe(false);
    expect(inbound.network).toBe(false);
    expect(inbound.transcript).toBe("rapor");
    const out = manager.place({ extension: "lab", text: "rapor", lang: "tr" });
    expect(out.placedOnCarrier).toBe(false);
    expect(out.environment).toBe("INTERNAL_LAB");
    expect(manager.transfer({ toAgent: "stock_ai" })).toMatchObject({ mode: "WRITTEN_HANDOFF", speechGranted: false });
    const moved = manager.transfer({ toAgent: "zeynep_hanim" });
    expect(moved.mode).toBe("VOICE_TRANSFER");
    expect(moved.placedOnCarrier).toBe(false);
    const rt = voice.createRealtimeEngine();
    const session = rt.open({ agentId: "pusat", lang: "tr" });
    expect(manager.drop(session).state).toBe("dropped");
    expect(rt.push(session, spoken.wav).code).toBe("MEDIA_DROPPED");
    expect(manager.resume(session).state).toBe("open");
    expect(rt.push(session, spoken.wav).ok).toBe(true);
    const finished = rt.finish(session);
    expect(finished.mediaScope).toBe("IN_PROCESS");
    expect(finished.lowLatencyVerified).toBe(false);
    expect(finished.network).toBe(false);
    const noted = manager.note("password=secret sk-live-abc");
    expect(noted.stored).not.toContain("secret");
    expect(noted.stored).not.toContain("sk-live");
    expect(voice.createSttEngine().generalSpeech).toBe(false);
  });
});
