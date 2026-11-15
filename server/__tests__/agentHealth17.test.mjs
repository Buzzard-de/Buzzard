import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { reportAgentHealth } = require("../lib/buzzardNative/core/agentHealth.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { assessVoice, providerAdapters } = require("../lib/voice/councilVoice.js");
const { assessVoice: assessVoiceReadiness } = require("../lib/voice/voiceReadiness.js");

describe("17-agent health report", () => {
  it("reports the official 17 without treating CODE_READY as reachability", () => {
    const report = reportAgentHealth();
    expect(report.rosterComplete).toBe(true);
    expect(report.count).toBe(17);
    expect(report.uniqueCount).toBe(17);
    expect(report.ids).toEqual([...SEED_IDS]);
    expect(report.chairId).toBe("pusat");
    expect(report.ok).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.salesEnabled).toBe(false);
    expect(report.liveNetwork).toBe(false);
    expect(report.codeReadyMeansReachable).toBe(false);
    expect(report.reachableCount).toBe(0);
    for (const legacyId of ["nesrin_hanim", "finance_ai", "phone_ai", "textile_ai"]) {
      expect(report.ids.includes(legacyId)).toBe(false);
    }
    for (const agent of report.agents) {
      expect(agent.codeStatus).toBe("CODE_READY");
      expect(agent.reachable).toBe(false);
      expect(agent.liveAccessible).toBe(false);
      expect(agent.codeReadyIsLive).toBe(false);
      expect(agent.ok).toBe(false);
      expect(agent.healthy).toBe(false);
      expect(agent.voice).toBe("NOT_CONFIGURED");
      expect(agent.stt).toBe("NOT_CONFIGURED");
      expect(agent.tts).toBe("NOT_CONFIGURED");
      expect(agent.phone).toBe("NOT_CONFIGURED");
      expect(agent.liveNetwork).toBe("NOT_CONFIGURED");
      expect(agent.status).toBe("NOT_CONFIGURED");
      expect(new Set([agent.voice, agent.stt, agent.tts, agent.phone, agent.liveNetwork]).size).toBe(1);
      expect(agent.fault).toBe(null);
    }
  });

  it("keeps one agent fault from changing the other agents", () => {
    const report = reportAgentHealth({ faults: { banu_hanim: { code: "PROBE_FAILED" }, nesrin_hanim: { code: "IGNORED" } } });
    const banu = report.agents.find((agent) => agent.id === "banu_hanim");
    const sinan = report.agents.find((agent) => agent.id === "sinan_bey");
    expect(report.failedIds).toEqual(["banu_hanim"]);
    expect(report.count).toBe(17);
    expect(banu.status).toBe("ERROR");
    expect(banu.ok).toBe(false);
    expect(banu.fault).toEqual({ code: "PROBE_FAILED", isolated: true });
    expect(banu.reachable).toBe(false);
    expect(sinan.status).toBe("NOT_CONFIGURED");
    expect(sinan.fault).toBe(null);
    expect(sinan.codeStatus).toBe("CODE_READY");
    expect(sinan.healthy).toBe(false);
  });

  it("does not report unconfigured voice channels as CODE_READY or live", () => {
    const voice = assessVoice();
    expect(voice.stt).toBe(false);
    expect(voice.tts).toBe(false);
    expect(voice.liveCalls).toBe(false);
    expect(voice.codeStatus).toBe("CODE_READY");
    expect(voice.status).toBe("NOT_CONFIGURED");
    expect(voice.reachable).toBe(false);
    expect(voice.codeReadyIsLive).toBe(false);
    expect(voice.voice).toBe("NOT_CONFIGURED");
    expect(voice.sttStatus).toBe("NOT_CONFIGURED");
    expect(voice.ttsStatus).toBe("NOT_CONFIGURED");
    expect(voice.phone).toBe("NOT_CONFIGURED");
    expect(voice.liveNetwork).toBe("NOT_CONFIGURED");
    expect(providerAdapters().find((row) => row.id === "stt").status).toBe("NOT_CONFIGURED");
    expect(providerAdapters().find((row) => row.id === "tts").status).toBe("NOT_CONFIGURED");
    const readiness = assessVoiceReadiness();
    expect(readiness.liveCalls).toBe(false);
    expect(readiness.reachable).toBe(false);
    expect(readiness.codeReadyIsLive).toBe(false);
    expect(["NOT_CONFIGURED", "UNKNOWN"]).toContain(readiness.stt);
    expect(["NOT_CONFIGURED", "UNKNOWN"]).toContain(readiness.tts);
    expect(["NOT_CONFIGURED", "UNKNOWN"]).toContain(readiness.phone);
    expect(readiness.liveNetwork).toBe("NOT_CONFIGURED");
    expect(readiness.status === "CODE_READY" && readiness.reachable).toBe(false);
  });
});
