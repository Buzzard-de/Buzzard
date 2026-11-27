import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { VOICE_ID } = require("../lib/buzzardNative/speech/voiceIdentity");
const { g2p } = require("../lib/buzzardNative/speech/nativeTts");
const ttsGate = require("../lib/buzzardNative/speech/ttsGate");
const sttGate = require("../lib/buzzardNative/hearing/sttGate");
const media = require("../lib/voice/staffMedia");
const realtime = require("../lib/voice/openaiRealtime");
const twilio = require("../lib/voice/twilioAdapter");
const rtc = require("../lib/voice/rtcMedia");
const { holdStaffMeeting } = require("../lib/buzzardNative/platform/councilMeeting");

describe("council staff media", () => {
  it("synthesizes distinct wav profiles and reads the samples back", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const voices = media.rosterVoices();
    expect(voices).toHaveLength(17);
    expect(voices.filter((row) => row.voiceId === VOICE_ID).map((row) => row.agentId)).toEqual(["sinan_bey"]);
    const sinan = media.synthesizeStaff({ agentId: "sinan_bey", text: "merhaba", lang: "tr" });
    const amelia = media.synthesizeStaff({ agentId: "amelia", text: "merhaba", lang: "tr" });
    expect(sinan.audio).toBe(true);
    expect(sinan.wav.slice(0, 4).toString("ascii")).toBe("RIFF");
    expect(sinan.voiceId).toBe(VOICE_ID);
    expect(sinan.officialVoiceUsed).toBe(false);
    expect(amelia.voiceId).not.toBe(VOICE_ID);
    expect(sinan.wav.equals(amelia.wav)).toBe(false);
    const expected = g2p("merhaba", "tr").phonemes.filter(Boolean).slice(0, 16);
    const heard = media.transcribeStaff({ audio: amelia.wav, lang: "tr" });
    expect(heard.phonemes).toEqual(expected);
    expect(heard.generalStt).toBe(false);
    expect(heard.orthographyRecovered).toBe(false);
    const dir = mkdtempSync(path.join(os.tmpdir(), "buzzard-wav-"));
    const file = path.join(dir, "amelia.wav");
    writeFileSync(file, amelia.wav);
    expect(media.transcribeStaff({ file, lang: "tr" }).phonemes).toEqual(expected);
    expect(readFileSync(file).length).toBe(amelia.bytes);
    expect(media.transcribeStaff({ audio: Buffer.from("nope"), lang: "tr" }).code).toBe("UNSUPPORTED_OR_CORRUPT_AUDIO");
    expect(media.synthesizeStaff({ agentId: "stock_ai", text: "stok", lang: "tr" }).code).toBe("CAPABILITY_DENIED");
    expect(media.synthesizeStaff({ agentId: "amelia", text: "hello", lang: "en" }).ok).toBe(true);
    expect(media.synthesizeStaff({ agentId: "amelia", text: "hallo", lang: "de" }).ok).toBe(true);
    expect(ttsGate.synthesize({ agentId: "sinan_bey", voiceId: VOICE_ID }).code).toBe("CLONE_DENIED");
    expect(sttGate.transcribe({ audio: Buffer.from([1, 2, 3, 4]), lang: "tr" }).code).toBe("PROVIDER_ABSENT");
  });

  it("routes a spoken price word through Pusat without a live provider", () => {
    media.clearHistory();
    const spoken = media.synthesizeStaff({ agentId: "pusat", text: "fiyat", lang: "tr" });
    const db = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-voice-")), "orch.sqlite");
    const routed = media.voiceRequest({ actorId: "pusat", agentId: "pricing_ai", audio: spoken.wav, lang: "tr", dbPath: db });
    expect(routed).toMatchObject({ ok: true, domain: "price", routed: true, live: false, network: false, salesEnabled: false });
    expect(routed.task.completed).toBe(1);
    expect(routed.voiceId).not.toBe(VOICE_ID);
    expect(media.voiceRequest({ actorId: "amelia", audio: spoken.wav }).code).toBe("ORCHESTRATOR_REQUIRED");
    expect(media.recentHistory()[0].domain).toBe("price");
    expect(JSON.stringify(media.recentHistory())).not.toContain("OPENAI");
  });

  it("keeps realtime, twilio, and rtc media closed to the network", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.BUZZARD_STUN_URL;
    expect(realtime.health()).toMatchObject({ configured: false, key: "missing", live: false, network: false });
    expect(realtime.openSession().code).toBe("NOT_CONFIGURED");
    const token = randomBytes(18).toString("hex");
    const params = { CallSid: "CA-test", From: "+10000000000", To: "+10000000001" };
    const url = "https://example.test/voice";
    const signature = twilio.signRequest(url, params, token);
    const wav = media.synthesizeStaff({ agentId: "zeynep_hanim", text: "alo", lang: "tr" }).wav;
    const accepted = twilio.receiveCall({ url, params, signature, token, audio: wav });
    expect(accepted).toMatchObject({ ok: true, code: "CALL_ACCEPTED", placed: false, live: false, network: false });
    expect(accepted.call.from).toBe("present");
    expect(JSON.stringify(accepted)).not.toContain(token);
    expect(twilio.receiveCall({ url, params, signature: "nope", token }).code).toBe("SIGNATURE_INVALID");
    expect(twilio.secretState().configured).toBe(false);
    const outbound = await twilio.placeCall({ to: "+10000000002", transport: async () => ({ status: 0 }) });
    expect(outbound.code).toBe("NOT_CONFIGURED");
    const moved = rtc.exchange({ wav });
    expect(moved.mediaVerified).toBe(true);
    expect(moved.bytes).toBe(wav.length);
    expect(moved.liveNetwork).toBe(false);
    expect(moved.ice.configured).toBe(false);
    expect(rtc.reconnect({ wav }).reconnected).toBe(true);
  });

  it("binds spoken reports and mouth timing to the same meeting", () => {
    const meeting = holdStaffMeeting({ topic: "ses", voice: true });
    expect(meeting.members).toBe(17);
    expect(meeting.liveVoice).toBe(false);
    expect(meeting.minutes).toContain("Sinan Bey");
    const sinan = meeting.media.find((row) => row.speaker === "sinan_bey");
    const amelia = meeting.media.find((row) => row.speaker === "amelia");
    expect(sinan.voiceId).toBe(VOICE_ID);
    expect(sinan.officialVoiceUsed).toBe(false);
    expect(sinan.lipSync).toBe(true);
    expect(sinan.mesh).toBe("NOT_CONFIGURED");
    expect(amelia.voiceId).not.toBe(VOICE_ID);
    expect(amelia.transcript.length).toBeGreaterThan(0);
    expect(meeting.media.some((row) => row.speaker === "stock_ai")).toBe(false);
    expect(meeting.turns.find((turn) => turn.speaker === "stock_ai").audioProduced).toBe(false);
  });
});
