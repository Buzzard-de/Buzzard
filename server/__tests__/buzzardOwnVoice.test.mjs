import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { VOICE_ID } = require("../lib/buzzardNative/speech/voiceIdentity");
const voice = require("../lib/voice/buzzardVoice");

describe("Buzzard own voice", () => {
  it("recognizes Turkish, German, and English from the wav itself", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const tts = voice.createTtsEngine();
    const stt = voice.createSttEngine();
    for (const row of [
      ["tr", "fiyat"],
      ["de", "preis"],
      ["en", "price"],
    ]) {
      const spoken = tts.speak({ agentId: "amelia", text: row[1], lang: row[0] });
      expect(spoken.audioQuality.ok).toBe(true);
      expect(spoken.hostedProvider).toBeNull();
      const heard = stt.recognize({ audio: spoken.wav, lang: row[0] });
      expect(heard.transcript).toBe(row[1]);
      expect(heard.orthographyRecovered).toBe(true);
      expect(heard.saas).toBe(false);
    }
    const noise = tts.speak({ agentId: "amelia", text: "rapor", lang: "tr" }).wav;
    expect(stt.recognize({ audio: noise, lang: "en" }).code).toBe("UNRECOGNIZED_SPEECH");
    expect(stt.recognize({ audio: Buffer.from("RIFF"), lang: "tr" }).transcript).toBeNull();
    expect(stt.recognize({ audio: noise, lang: "tr", timeoutMs: 0 }).code).toBe("STT_TIMEOUT");
  });

  it("keeps seventeen voice identities and Sinan's reference on Sinan only", () => {
    const rows = voice.createVoiceIdentityEngine().list();
    expect(rows).toHaveLength(17);
    expect(new Set(rows.map((row) => row.voiceId)).size).toBe(17);
    const sinan = rows.find((row) => row.agentId === "sinan_bey");
    expect(sinan.voiceId).toBe(VOICE_ID);
    expect(sinan.referenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sinan.cloneAuthorized).toBe(false);
    expect(rows.filter((row) => row.officialReference)).toEqual([sinan]);
    const spoken = voice.createTtsEngine().speak({ agentId: "sinan_bey", text: "rapor", lang: "tr" });
    expect(spoken.officialVoiceUsed).toBe(false);
    expect(spoken.wav.includes(Buffer.from(sinan.referenceHash))).toBe(false);
  });

  it("runs a call and a realtime stream without a hosted provider", () => {
    const tts = voice.createTtsEngine();
    const wav = tts.speak({ agentId: "pusat", text: "fiyat", lang: "tr" }).wav;
    const db = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-phone-")), "orch.sqlite");
    const session = voice.createSpeechSession();
    const turned = session.command({ audio: wav, lang: "tr", dbPath: db });
    expect(turned.saas).toBe(false);
    expect(turned.realtime.transcript).toBe("fiyat");
    expect(turned.realtime.reply.bytes).toBeGreaterThan(44);
    expect(turned.realtime.network).toBe(false);
    expect(turned.call).toMatchObject({
      transcript: "fiyat",
      routedTo: "pricing_ai",
      coordinator: "pusat",
      carrier: "buzzard",
      externalSaas: false,
      state: "completed",
      salesEnabled: false,
    });
    expect(turned.call.taskCompleted).toBe(1);
    expect(turned.call.mouth.lipSync).toBe(true);
    expect(turned.call.mouth.mesh).toBe("NOT_CONFIGURED");
    const phone = voice.createPhoneEngine();
    expect(phone.receive({}).code).toBe("CALL_AUDIO_MISSING");
    const out = phone.place({ extension: "zeynep", text: "rapor", lang: "tr" });
    expect(out.placedOnCarrier).toBe(false);
    expect(out.carrier).toBe("buzzard");
    expect(phone.report()).toHaveLength(1);
  });

  it("puts every speaking member on one Pusat meeting record", () => {
    const meeting = voice.createSpeechSession().meeting({ topic: "kurmay" });
    expect(meeting.ok).toBe(true);
    expect(meeting.members).toBe(17);
    expect(meeting.chair).toBe("pusat");
    expect(meeting.saas).toBe(false);
    expect(meeting.salesEnabled).toBe(false);
    const speakers = meeting.turns.filter((turn) => turn.bytes);
    expect(speakers.length).toBeGreaterThan(8);
    expect(speakers.every((turn) => turn.transcript === "rapor" && turn.lipSync === true)).toBe(true);
    expect(speakers.find((turn) => turn.speaker === "sinan_bey").officialReference).toBe(true);
    expect(speakers.some((turn) => turn.speaker === "stock_ai")).toBe(false);
    expect(meeting.minutes).toContain("rapor");
  });
});
