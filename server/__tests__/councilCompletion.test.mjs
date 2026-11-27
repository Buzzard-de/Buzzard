import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { presentSpeaker } = require("../lib/voice/meshAvatar.js");
const { recognizeNatural, councilAssets } = require("../lib/voice/naturalSpeech.js");
const { localTurnProbe, internetCallStatus } = require("../lib/voice/rtcMedia.js");
const { localSipBusy, localSipInbound, localSipSrtp, phoneStackStatus } = require("../lib/voice/sipLocal.js");
const { sessionFromMaster } = require("../lib/voice/srtpLab.js");
const { speakCatalog, turkishCatalog } = require("../lib/voice/turkishCatalog.js");
const { withHeavyProcess } = require("../lib/buzzardNative/thinking/localProcessLock.js");

describe("council completion", () => {
  it("pauses a meeting and resumes it from the engine record", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-complete-")), "orch.sqlite");
    const orch = createOrchestrator({ dbPath });
    const session = orch.holdCouncil({ topic: "devam", speak: false, pause: true });
    expect(session.status).toBe("PAUSED");
    expect(session.paused).toBe(true);
    expect(session.salesEnabled).toBe(false);
    expect(session.simultaneousSpeech).toBe(false);
    const resumed = orch.resumeCouncil(session.meetingId);
    expect(resumed.status).toBe("CLOSED");
    expect(resumed.summary.members).toBe(17);
    expect(resumed.summary.source).toBe("ENGINE");
    expect(resumed.summary.salesEnabled).toBe(false);
    const review = orch.reviewMeeting(session.meetingId);
    expect(review.events.some((row) => row.kind === "summary")).toBe(true);
    expect(review.events.some((row) => row.kind === "decision")).toBe(true);
    expect(review.events.some((row) => row.kind === "pause")).toBe(true);
    orch.close();
  }, 90000);

  it("keeps catalog Turkish voices off personal member profiles", () => {
    const catalog = turkishCatalog();
    expect(catalog.voices.map((voice) => voice.speaker).sort()).toEqual(["elif", "emre"]);
    expect(catalog.voices.every((voice) => voice.present && voice.personal === false && voice.assignedAgent === null && voice.license === "Apache-2.0")).toBe(true);
    expect(catalog.gated[0]).toMatchObject({ id: "cem", status: "BLOCKED_EXTERNAL", present: false, personal: false });
    expect(catalog.productVoice).toBe("tr_TR-antalia-medium.onnx");
    const assets = councilAssets();
    expect(assets.every((row) => row.personalVoice === "BLOCKED_ASSET" && row.catalogVoice === false)).toBe(true);
    const elif = speakCatalog({ speaker: "elif", text: "Ankara Turkiye'nin baskentidir." });
    const emre = speakCatalog({ speaker: "emre", text: "Ankara Turkiye'nin baskentidir." });
    expect(elif.personal).toBe(false);
    expect(emre.personal).toBe(false);
    expect(elif.sha256).not.toBe(emre.sha256);
    const heard = recognizeNatural({ wav: elif.wav, lang: "tr" });
    expect(heard.replaced).toBe(false);
    expect(String(heard.transcript || "").toLowerCase()).toMatch(/ankara/);
  }, 120000);

  it("rejects a missing character file and keeps the placeholder off the member", () => {
    const wav = Buffer.alloc(800);
    wav.write("RIFF", 0);
    const missing = presentSpeaker({ agentId: "pusat", wav, gltfPath: path.join(os.tmpdir(), "missing-member.glb") });
    expect(missing.avatarError).toBe("AVATAR_LOAD_FAILED");
    expect(missing.assetStatus).toBe("BLOCKED_ASSET");
    expect(missing.realCharacter).toBe(false);
    expect(missing.display).toBe("NONE");
    expect(missing.photoreal).toBe(false);
  });

  it("runs a local TURN allocation without calling it an internet session", async () => {
    const internet = internetCallStatus();
    expect(internet.status).toBe("BLOCKED_EXTERNAL");
    expect(internet.verified).toBe(false);
    expect(internet.internet).toBe(false);
    const turn = await localTurnProbe();
    expect(turn.installed).toBe(true);
    expect(turn.internet).toBe(false);
    expect(turn.verified).toBe(false);
    expect(turn.paidTurn).toBe(false);
    expect(turn.localTurn).toBe(true);
    expect(turn.status).toBe("PARTIAL");
  }, 20000);

  it("records a busy SIP response and an inbound lab call for Zeynep", async () => {
    const busy = await localSipBusy();
    expect(busy).toMatchObject({
      code: "SIP_BUSY",
      handled: true,
      connected: false,
      rtpPackets: 0,
      srtp: false,
      phoneLine: "BLOCKED_EXTERNAL",
    });
    const inbound = await localSipInbound();
    expect(inbound).toMatchObject({
      code: "SIP_INBOUND",
      direction: "inbound",
      routedTo: "zeynep_hanim",
      connected: true,
      rtp: true,
      srtp: false,
      phoneLine: "BLOCKED_EXTERNAL",
    });
    expect(inbound.record.agentId).toBe("zeynep_hanim");
    const stack = phoneStackStatus();
    expect(stack.freeswitchInstalled).toBe(false);
    expect(stack.freeswitchRunning).toBe(false);
    expect(stack.configPrepared).toBe(true);
    expect(stack.phoneLine).toBe("BLOCKED_EXTERNAL");
    expect(stack.paidApi).toBe(false);
    const keys = sessionFromMaster();
    expect(keys.key.toString("hex")).toBe("c61e7a93744f39ee10734afe3ff7a087");
    expect(keys.auth.toString("hex")).toBe("cebe321f6ff7716b6fd4ab49af256a156d38baa4");
    expect(keys.salt.toString("hex")).toBe("30cbbc08863d8c85d49db34a9ae1");
    const secure = await localSipSrtp();
    expect(secure).toMatchObject({
      ok: true,
      code: "SIP_SRTP_LAB",
      media: "SRTP",
      srtp: true,
      rtp: false,
      srtpPackets: 1,
      rejectedPackets: 1,
      tls: false,
      secure: false,
      carrier: false,
      phoneLine: "BLOCKED_EXTERNAL",
      internet: false,
      keyExchange: "LAB_MASTER",
    });
  });

  it("releases the heavy process lock after each local job", () => {
    expect(withHeavyProcess(() => "first")).toBe("first");
    expect(withHeavyProcess(() => "second")).toBe("second");
  });
});
