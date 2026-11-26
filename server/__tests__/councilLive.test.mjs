import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator, classifyRequest } = require("../lib/pusat/orchestrator.js");
const { getOrchestrator, forget } = require("../lib/pusat/orchRuntime.js");
const { openDurableFile } = require("../lib/pusat/durable.js");
const { speakNatural, recognizeNatural, voiceFor, voiceRecord, PROFILES, TURKISH } = require("../lib/voice/naturalSpeech.js");
const { presentSpeaker } = require("../lib/voice/meshAvatar.js");
const { loopbackMedia, twoProcessMedia, gatherCandidates } = require("../lib/voice/rtcMedia.js");
const { localSipCall, isRtp } = require("../lib/voice/sipLocal.js");
const { STRONG, rejectInventedClaim, groundedSentence, answerIsGrounded, guardUnknown } = require("../lib/buzzardNative/thinking/localLanguageModel.js");
const fs = require("node:fs");

describe("council live speech and media", () => {
  it("recognizes natural speech in Turkish, German, and English", () => {
    const samples = [
      { lang: "tr", text: "Ankara Turkiye'nin baskentidir.", expect: /ankara/i },
      { lang: "de", text: "Die Lieferung kommt aus Berlin.", expect: /berlin/i },
      { lang: "en", text: "Berlin is the capital of Germany.", expect: /berlin/i },
    ];
    for (const sample of samples) {
      const spoken = speakNatural({ text: sample.text, lang: sample.lang, agentId: "pusat", languageVoice: true });
      expect(spoken.naturalSpeech).toBe(true);
      expect(spoken.toneCodec).toBe(false);
      expect(spoken.bytes).toBeGreaterThan(1000);
      const heard = recognizeNatural({ wav: spoken.wav, lang: sample.lang });
      expect(heard.generalSpeech).toBe(true);
      expect(heard.lexicon).toBe(false);
      expect(heard.transcript).toMatch(sample.expect);
      expect(heard.raw).toBe(heard.transcript);
      expect(heard.replaced).toBe(false);
      expect(spoken.languageMatch).toBe(true);
    }
    const noisy = Buffer.from(samples[0] ? speakNatural({ text: samples[0].text, lang: "tr", languageVoice: true }).wav : Buffer.alloc(0));
    for (let i = 44; i < noisy.length; i += 8) noisy[i] = noisy[i] ^ 0x3f;
    const messy = recognizeNatural({ wav: noisy, lang: "tr" });
    expect(messy.replaced).toBe(false);
    if (messy.transcript) expect(messy.raw).toBe(messy.transcript);
    const shortLine = speakNatural({ text: "Pusat.", lang: "tr", languageVoice: true });
    const shortHeard = recognizeNatural({ wav: shortLine.wav, lang: "tr" });
    expect(shortHeard.replaced).toBe(false);
    expect(shortHeard.raw).toBe(shortHeard.transcript);
    const longLine = speakNatural({ text: "Pusat Ankara kaydini kontrol eder ve fiyat durumunu soyler.", lang: "tr", languageVoice: true });
    const longHeard = recognizeNatural({ wav: longLine.wav, lang: "tr" });
    expect(longHeard.replaced).toBe(false);
    expect(longHeard.raw).toBe(longHeard.transcript);
    expect(longHeard.transcript.toLowerCase()).toMatch(/ankara|pusat|fiyat/);
    const priceLine = speakNatural({ text: "Fiyat hesapla.", lang: "tr", languageVoice: true });
    const priceHeard = recognizeNatural({ wav: priceLine.wav, lang: "tr" });
    expect(priceHeard.replaced).toBe(false);
    expect(classifyRequest(priceHeard.transcript || "").domain || classifyRequest(priceHeard.transcript || "").code).toBeTruthy();
    const pusatVoice = voiceFor("pusat", "tr");
    const sinanVoice = voiceFor("sinan_bey", "tr");
    expect(pusatVoice.modelLang).toBe("tr");
    expect(pusatVoice.languageMatch).toBe(true);
    expect(sinanVoice.languageMatch).toBe(false);
    expect(pusatVoice.license).toBe("CC-BY-4.0");
    expect(pusatVoice.turkishNatural).toBe(true);
    expect(pusatVoice.commercialUse).toBe(true);
    expect(pusatVoice.synthetic).toBe(true);
    expect(sinanVoice.turkishNatural).toBe(false);
    expect(sinanVoice.languageMatch).toBe(false);
    expect(voiceRecord("tr_TR-dfki-medium.onnx")).toMatchObject({
      license: "CC-BY-NC-SA-4.0",
      commercialUse: false,
      productVoice: false,
    });
    const shared = speakNatural({ text: "Pusat fiyat kaydını kontrol eder.", lang: "tr", agentId: "zeynep_hanim", turkish: true });
    expect(shared.modelFile).toBe(TURKISH.file);
    expect(shared.turkishNatural).toBe(true);
    expect(shared.ownVoice).toBe(false);
    expect(shared.sharedVoice).toBe(true);
    expect(shared.synthetic).toBe(true);
    expect(shared.officialVoiceUsed).toBe(false);
    const sharedHeard = recognizeNatural({ wav: shared.wav, lang: "tr" });
    expect(sharedHeard.replaced).toBe(false);
    expect(sharedHeard.raw).toBe(sharedHeard.transcript);
    expect(speakNatural({ text: "Deneme.", lang: "tr", agentId: "pusat", modelFile: "missing-voice.onnx" }).code).toBe("NATURAL_SPEECH_NOT_CONFIGURED");
    const pusat = speakNatural({ text: "Pusat raporunu okur.", lang: "tr", agentId: "pusat" });
    const zeynep = speakNatural({ text: "Pusat raporunu okur.", lang: "tr", agentId: "zeynep_hanim" });
    expect(pusat.voiceId).not.toBe(zeynep.voiceId);
    expect(pusat.modelFile).not.toBe(zeynep.modelFile);
    expect(pusat.scaleOnly).toBe(false);
    expect(pusat.sha256).not.toBe(zeynep.sha256);
    expect(new Set(Object.values(PROFILES).map((row) => row.file)).size).toBe(12);
    const sinan = voiceFor("sinan_bey");
    expect(sinan.officialReference).toBe("public/council/sinan-bey-official-voice-v1.m4a");
    expect(sinan.officialVoiceUsed).toBe(false);
    expect(sinan.referenceMixedIntoTts).toBe(false);
    expect(sinan.modelFile.endsWith(".onnx")).toBe(true);
    expect(voiceFor("stock_ai").speech).toBe(false);
    const face = presentSpeaker({ agentId: "pusat", wav: pusat.wav });
    const quiet = presentSpeaker({ agentId: "pusat", wav: Buffer.alloc(44) });
    expect(face.is3d).toBe(false);
    expect(face.assetStatus).toBe("BLOCKED_ASSET");
    expect(face.realCharacter).toBe(false);
    expect(face.previewMesh).toBe(true);
    expect(face.state).toBe("speaking");
    const idle = presentSpeaker({ agentId: "pusat", wav: pusat.wav, state: "idle" });
    expect(idle.state).toBe("idle");
    expect(idle.lipSync).toBe(false);
    expect(idle.peakJaw).toBe(0);
    expect(idle.stopped).toBe(true);
    const gltf = path.join(os.tmpdir(), `buzzard-head-${process.pid}.gltf`);
    fs.writeFileSync(gltf, JSON.stringify({ asset: { version: "2.0" }, meshes: [{ name: "preview", primitives: [] }] }));
    const loaded = presentSpeaker({ agentId: "pusat", wav: pusat.wav, gltfPath: gltf });
    expect(loaded.is3d).toBe(true);
    expect(loaded.assetStatus).toBe("PARTIAL");
    expect(loaded.realCharacter).toBe(false);
    expect(loaded.photoreal).toBe(false);
    fs.unlinkSync(gltf);
    expect(face.digitalHuman).toBe(false);
    expect(face.scannedBody).toBe(false);
    expect(face.css).toBe(false);
    expect(face.photoreal).toBe(false);
    expect(face.vertices).toBeGreaterThan(4);
    expect(face.lipSync).toBe(true);
    expect(face.stopped).toBe(true);
    expect(face.speaking).toBe(false);
    expect(face.realModel).toBe(false);
    expect(face.avatarComplete).toBe(false);
    expect(face.avatarId).toBe("pusat_avatar_v1");
    expect(face.open[1]).toBeLessThan(face.rest[1]);
    expect(face.meshHash).not.toBe(presentSpeaker({ agentId: "zeynep_hanim", wav: zeynep.wav }).meshHash);
    expect(quiet.ok).toBe(false);
    const invented = "Pusat ASSIGN_TASK durumu COMPLETED. satis gecmisi var";
    expect(rejectInventedClaim({ fact: "live=false", answer: invented })).toBe(true);
    const report = { agentId: "pusat", kind: "ASSIGN_TASK", status: "COMPLETED", fact: "live=false" };
    const safe = groundedSentence(report);
    expect(answerIsGrounded(report, safe)).toBe(true);
    expect(safe).not.toMatch(/satış geçmiş|satis gecmis/i);
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
    const paired = await twoProcessMedia({ payload: Buffer.from("buzzard-pcm-frame"), reconnect: true });
    expect(paired.clients).toBe(2);
    expect(paired.processes).toBe(2);
    expect(paired.payload).toBe("buzzard-pcm-frame");
    expect(paired.srtp).toBe(paired.payload === "buzzard-pcm-frame");
    expect(paired.dtls).toBe(paired.connection === "connected" && paired.peerConnection === "connected");
    expect(paired.secure).toBe(paired.dtls === true && paired.srtp === true);
    expect(paired.internet).toBe(false);
    expect(paired.network).toBe("LOOPBACK");
    expect(paired.sessionId).not.toBe(paired.secondSessionId);
    expect(paired.reconnect).toBe(true);
    const counted = await twoProcessMedia({ payload: Buffer.from("buzzard-pcm-frame"), packets: 4 });
    expect(counted.sent).toBe(4);
    expect(counted.packets).toBe(4);
    expect(counted.loss).toBe(0);
    expect(counted.internet).toBe(false);
    const stun = await gatherCandidates({ stun: "stun:stun.l.google.com:19302" });
    expect(stun.internet).toBe(false);
    expect(stun.secure).toBe(false);
    expect(stun.media).toBe(false);
    expect(["STUN_PROBE", "STUN_UNREACHABLE"]).toContain(stun.code);
    const call = await localSipCall();
    expect(call).toMatchObject({
      ok: true,
      sip: true,
      ack: true,
      rtpPackets: 1,
      media: "RTP",
      srtp: false,
      secure: false,
      tls: false,
      mediaSecurity: "NONE",
      turnInstalled: false,
      carrier: false,
      carrierInbound: false,
      carrierOutbound: false,
      operatorCall: false,
      localLab: true,
      placedOnCarrier: false,
      network: "LOOPBACK",
      internet: false,
    });
    expect(isRtp(Buffer.from([0x80, 0, 0, 1]))).toBe(false);
  }, 20000);

  it("lets every specialist reason and speak through the existing council record", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-live-")), "orch.sqlite");
    const strong = path.join(process.cwd(), "data", "models", "language", STRONG.fileName);
    expect(fs.statSync(strong).size).toBe(STRONG.bytes);
    const orch = getOrchestrator({ dbPath });
    const session = await orch.convene({ topic: "fren diski Ankara", requester: "suleyman_bey" });
    const reasoned = { members: session.members, analysis: session.analysis, taskId: session.taskId, actionsExecuted: session.actionsExecuted, paid: session.analysis.paid };
    expect(reasoned.members).toBe(17);
    expect(reasoned.analysis.rows).toHaveLength(17);
    expect(reasoned.analysis.paid).toBe(false);
    expect(reasoned.actionsExecuted).toBe(false);
    for (const row of reasoned.analysis.rows) {
      expect(row.ruleExecution).toBe("RULE_BASED");
      expect(row.actionsExecuted).toBe(false);
      expect(row.passed).toBe(true);
      expect(row.grounded).toBe(true);
      if (row.modelAccepted) expect(row.execution).toBe("LOCAL_MODEL");
      else expect(row.execution).toBe("VERIFIED_ENGINE");
      const values = String(row.fact || "").split(";").map((part) => part.split("=").slice(1).join("=").toLowerCase()).filter(Boolean);
      for (const value of values) expect(row.answer.toLowerCase()).toContain(value);
      expect(row.answer).not.toMatch(/satış geçmiş|satis gecmis/i);
    }
    expect(reasoned.analysis.grounded).toBe(17);
    expect(session.requester).toBe("suleyman_bey");
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
    expect(voiced.every((clip) => clip.naturalSpeech && clip.lipSync && clip.is3d === false && clip.assetStatus === "BLOCKED_ASSET" && clip.css === false)).toBe(true);
    expect(voiced.every((clip) => clip.turkishNatural && clip.voiceModel === TURKISH.file)).toBe(true);
    expect(voiced.filter((clip) => clip.ownVoice).map((clip) => clip.agentId)).toEqual(["pusat"]);
    const modelSpeakers = reasoned.analysis.rows.filter((row) => row.modelAccepted && !silent.includes(row.agentId));
    expect(voiced.filter((clip) => clip.analysisSpoken).map((clip) => clip.agentId).sort()).toEqual(modelSpeakers.map((row) => row.agentId).sort());
    expect(voiced.every((clip) => clip.groundedSpoken)).toBe(true);
    expect(new Set(voiced.map((clip) => clip.profileModel)).size).toBe(12);
    expect(reasoned.analysis.passed + reasoned.analysis.failed).toBe(17);
    const hidden = reasoned.analysis.rows.filter((row) => !row.passed && row.execution === "LOCAL_MODEL");
    expect(hidden).toEqual([]);
    orch.close();
    forget(dbPath);
    const meetings = openDurableFile(`${dbPath}.meetings`);
    const stored = meetings.store.getMeeting(session.meetingId);
    expect(stored.status).toBe("CLOSED");
    expect(stored.events.filter((row) => row.kind === "voice")).toHaveLength(12);
    const verdicts = stored.events.filter((row) => row.kind === "verdict");
    expect(verdicts).toHaveLength(17);
    expect(verdicts.every((row) => {
      if (!row.payload.answer) return false;
      if (row.payload.rejected) return row.payload.execution === "VERIFIED_ENGINE" && row.payload.answer !== row.payload.rejected;
      return row.payload.modelAccepted === true;
    })).toBe(true);
    expect(verdicts.find((row) => row.speakerId === "pusat").payload.answer).not.toMatch(/satış geçmiş|satis gecmis/i);
    meetings.db.close();
    const again = createOrchestrator({ dbPath });
    expect(again.queue.get(reasoned.taskId).state).toBe("COMPLETED");
    expect(again.queue.get(reasoned.taskId).payload.actionsExecuted).toBe(false);
    expect(again.queue.get(reasoned.taskId).payload.specialistChecksPassed).toBe(reasoned.analysis.passed);
    expect(again.queue.get(reasoned.taskId).payload.allSpecialistsAccepted).toBe(reasoned.analysis.failed === 0);
    expect(again.queue.get(reasoned.taskId).payload.specialistChecksPassed).toBe(17);
    const reviewed = again.reviewMeeting(session.meetingId);
    expect(reviewed.status).toBe("CLOSED");
    expect(reviewed.voice).toHaveLength(12);
    expect(reviewed.voice.map((row) => row.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    again.close();
  }, 240000);

  it("keeps a rejected answer in the meeting and speaks the engine sentence", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-live-")), "orch.sqlite");
    const orch = createOrchestrator({ dbPath });
    const fact = "live=false";
    const safe = groundedSentence({ agentId: "pusat", kind: "ASSIGN_TASK", status: "COMPLETED", fact });
    const session = orch.holdCouncil({
      topic: "ret",
      speak: false,
      analysis: {
        rows: [{
          agentId: "pusat",
          kind: "ASSIGN_TASK",
          status: "COMPLETED",
          fact,
          answer: safe,
          rejected: "satış geçmişi var",
          modelAccepted: false,
          grounded: true,
          execution: "VERIFIED_ENGINE",
        }],
      },
    });
    orch.close();
    const meetings = openDurableFile(`${dbPath}.meetings`);
    const stored = meetings.store.getMeeting(session.meetingId);
    const verdict = stored.events.find((row) => row.kind === "verdict" && row.speakerId === "pusat");
    expect(verdict.payload.rejected).toBe("satış geçmişi var");
    expect(verdict.payload.answer).toBe(safe);
    expect(verdict.payload.modelAccepted).toBe(false);
    expect(answerIsGrounded({ agentId: "pusat", kind: "ASSIGN_TASK", status: "COMPLETED", fact }, verdict.payload.answer)).toBe(true);
    meetings.db.close();
  }, 30000);

  it("stops a meeting on interrupt and keeps the fault off the spoken record", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-live-")), "orch.sqlite");
    const orch = createOrchestrator({ dbPath });
    const session = orch.holdCouncil({ topic: "kesinti", speak: true, interruptAfter: "esat_bey", speechFault: "pusat" });
    expect(session.interrupted).toBe(true);
    const pusat = session.spoken.find((clip) => clip.agentId === "pusat");
    expect(pusat.error).toBe("TTS_FAILED");
    expect(pusat.audio).toBe(false);
    expect(session.spoken.some((clip) => clip.agentId === "dogu_bey" && clip.audio)).toBe(false);
    orch.close();
    const again = createOrchestrator({ dbPath });
    const reviewed = again.reviewMeeting(session.meetingId);
    expect(reviewed.events.some((row) => row.kind === "interrupt")).toBe(true);
    expect(reviewed.events.some((row) => row.kind === "voice_error" && row.speakerId === "pusat")).toBe(true);
    expect(reviewed.voice.map((row) => row.agentId)).toEqual(["sinan_bey", "esat_bey"]);
    again.close();
  }, 30000);

  it("refuses a confident answer when no source was given", async () => {
    const guarded = await guardUnknown();
    expect(guarded.certain).toBe(false);
    expect(guarded.paid).toBe(false);
    if (guarded.ok) expect(guarded.answer).toMatch(/^UNVERIFIED/i);
    else expect(guarded.code).not.toBe("LOCAL_MODEL");
  }, 30000);
});
