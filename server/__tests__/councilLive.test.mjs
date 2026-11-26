import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { openDurableFile } = require("../lib/pusat/durable.js");
const { speakNatural, recognizeNatural, voiceFor } = require("../lib/voice/naturalSpeech.js");
const { presentSpeaker } = require("../lib/voice/meshAvatar.js");
const { loopbackMedia } = require("../lib/voice/rtcMedia.js");
const { localSipCall } = require("../lib/voice/sipLocal.js");
const { STRONG } = require("../lib/buzzardNative/thinking/localLanguageModel.js");
const fs = require("node:fs");

describe("council live speech and media", () => {
  it("recognizes natural speech in Turkish, German, and English", () => {
    const samples = [
      { lang: "tr", text: "Ankara Turkiye'nin baskentidir.", expect: /ankara/i },
      { lang: "de", text: "Die Lieferung kommt aus Berlin.", expect: /berlin/i },
      { lang: "en", text: "Berlin is the capital of Germany.", expect: /berlin/i },
    ];
    for (const sample of samples) {
      const spoken = speakNatural({ text: sample.text, lang: sample.lang, agentId: "pusat" });
      expect(spoken.naturalSpeech).toBe(true);
      expect(spoken.toneCodec).toBe(false);
      expect(spoken.bytes).toBeGreaterThan(1000);
      const heard = recognizeNatural({ wav: spoken.wav, lang: sample.lang });
      expect(heard.generalSpeech).toBe(true);
      expect(heard.lexicon).toBe(false);
      expect(heard.transcript).toMatch(sample.expect);
    }
    const pusat = speakNatural({ text: "Pusat raporunu okur.", lang: "tr", agentId: "pusat" });
    const zeynep = speakNatural({ text: "Pusat raporunu okur.", lang: "tr", agentId: "zeynep_hanim" });
    expect(pusat.voiceId).not.toBe(zeynep.voiceId);
    expect(pusat.sha256).not.toBe(zeynep.sha256);
    expect(voiceFor("stock_ai").speech).toBe(false);
    const face = presentSpeaker({ agentId: "pusat", wav: pusat.wav });
    const quiet = presentSpeaker({ agentId: "pusat", wav: Buffer.alloc(44) });
    expect(face.is3d).toBe(true);
    expect(face.css).toBe(false);
    expect(face.photoreal).toBe(false);
    expect(face.lipSync).toBe(true);
    expect(face.open[1]).toBeLessThan(face.rest[1]);
    expect(quiet.ok).toBe(false);
  }, 60000);

  it("carries audio over a local WebRTC peer and a local SIP call", async () => {
    const media = await loopbackMedia({ payload: Buffer.from("buzzard-pcm-frame"), reconnect: true });
    expect(media).toMatchObject({
      ok: true,
      ice: "connected",
      connection: "connected",
      dtls: true,
      srtp: true,
      payload: "buzzard-pcm-frame",
      network: "LOOPBACK",
      internet: false,
      turn: false,
      carrier: false,
      reconnect: true,
    });
    const call = await localSipCall();
    expect(call).toMatchObject({
      ok: true,
      sip: true,
      rtpPackets: 1,
      media: "RTP",
      srtp: false,
      carrier: false,
      placedOnCarrier: false,
      network: "LOOPBACK",
    });
  }, 20000);

  it("lets every specialist reason and speak through the existing council record", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-live-")), "orch.sqlite");
    const strong = path.join(process.cwd(), "data", "models", "language", STRONG.fileName);
    expect(fs.statSync(strong).size).toBe(STRONG.bytes);
    const orch = createOrchestrator({ dbPath });
    const reasoned = await orch.reasonMembers();
    expect(reasoned.members).toBe(17);
    expect(reasoned.analysis.rows).toHaveLength(17);
    expect(reasoned.analysis.paid).toBe(false);
    expect(reasoned.actionsExecuted).toBe(false);
    for (const row of reasoned.analysis.rows) {
      expect(row.ruleExecution).toBe("RULE_BASED");
      expect(row.actionsExecuted).toBe(false);
      expect(row.passed).toBe(row.execution === "LOCAL_MODEL");
    }
    const session = orch.holdCouncil({ topic: "sesli kurmay", speak: true, analysis: reasoned.analysis });
    expect(session.members).toBe(17);
    expect(session.naturalSpeech).toBe(true);
    expect(session.photoreal).toBe(false);
    expect(session.stockSpeech).toBe(false);
    expect(session.carrier).toBe(false);
    expect(session.placedOnCarrier).toBe(false);
    const stock = session.spoken.find((clip) => clip.agentId === "stock_ai");
    expect(stock.audio).toBe(false);
    const silent = session.spoken.filter((clip) => clip.speech === false).map((clip) => clip.agentId).sort();
    expect(silent).toEqual(["category_ai", "pricing_ai", "sales_analysis_ai", "seo_ai", "stock_ai"]);
    const voiced = session.spoken.filter((clip) => clip.speech);
    expect(voiced).toHaveLength(12);
    expect(new Set(voiced.map((clip) => clip.voiceId)).size).toBe(12);
    expect(voiced.every((clip) => clip.naturalSpeech && clip.lipSync && clip.is3d && clip.css === false)).toBe(true);
    const acceptedSpeakers = reasoned.analysis.rows.filter((row) => row.passed && !silent.includes(row.agentId));
    expect(voiced.filter((clip) => clip.analysisSpoken).map((clip) => clip.agentId).sort()).toEqual(acceptedSpeakers.map((row) => row.agentId).sort());
    expect(reasoned.analysis.passed + reasoned.analysis.failed).toBe(17);
    const hidden = reasoned.analysis.rows.filter((row) => !row.passed && row.execution === "LOCAL_MODEL");
    expect(hidden).toEqual([]);
    for (const row of reasoned.analysis.rows.filter((item) => item.passed)) {
      expect(row.answer.toLowerCase()).toContain(String(row.kind).toLowerCase());
      const values = String(row.fact || "").split(";").map((part) => part.split("=").slice(1).join("=").toLowerCase()).filter(Boolean);
      expect(values.some((value) => row.answer.toLowerCase().includes(value))).toBe(true);
    }
    orch.close();
    const meetings = openDurableFile(`${dbPath}.meetings`);
    const stored = meetings.store.getMeeting(session.meetingId);
    expect(stored.status).toBe("CLOSED");
    expect(stored.events.filter((row) => row.kind === "voice")).toHaveLength(12);
    meetings.db.close();
    const again = createOrchestrator({ dbPath });
    expect(again.queue.get(reasoned.taskId).state).toBe("COMPLETED");
    expect(again.queue.get(reasoned.taskId).payload.actionsExecuted).toBe(false);
    expect(again.queue.get(reasoned.taskId).payload.specialistChecksPassed).toBe(reasoned.analysis.passed);
    expect(again.queue.get(reasoned.taskId).payload.allSpecialistsAccepted).toBe(reasoned.analysis.failed === 0);
    again.close();
  }, 180000);
});
