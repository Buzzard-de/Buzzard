import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { VOICE_ID } = require("../lib/buzzardNative/speech/voiceIdentity");
const { inspectReference, synthesize } = require("../lib/buzzardNative/speech/ttsGate");
const { transcribe } = require("../lib/buzzardNative/hearing/sttGate");
const body = require("../lib/buzzardNative/engines/digitalBodySession");
const { capturePayment } = require("../lib/commerce/paymentService");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");
const { isSalesEnabled } = require("../lib/salesMode");

afterEach(() => body.clearSessions());

describe("ninth pass voice gate", () => {
  it("checks Sinan's reference without rewriting it or enabling TTS", () => {
    const first = inspectReference();
    const second = inspectReference();
    expect(first.ok).toBe(true);
    expect(first.hashMatches).toBe(true);
    expect(first.unchanged).toBe(true);
    expect(first.voiceId).toBe(VOICE_ID);
    expect(first.playable).toBe(true);
    expect(first.container.codec).toBe("aac");
    expect(first.container.sampleRateHz).toBe(48000);
    expect(first.container.channels).toBe(2);
    expect(first.container.durationSec).toBeGreaterThan(20);
    expect(first.bytes).toBe(second.bytes);
    expect(first.cloneAuthorized).toBe(false);
    expect(first.ttsReady).toBe(false);
  });

  it("refuses to clone Sinan and does not lend his voice id", () => {
    const sinan = synthesize({ agentId: "sinan_bey", voiceId: VOICE_ID });
    expect(sinan.code).toBe("CLONE_DENIED");
    expect(sinan.bytes).toBe(0);
    expect(sinan.ttsReady).toBe(false);
    expect(sinan.officialVoiceUsed).toBe(false);
    for (const key of ["esat", "dogu", "mira", "leon", "amelia", "adrian"]) {
      const other = synthesize({ agentId: body.PROFILES[key].agentId, voiceId: body.PROFILES[key].voiceId });
      expect(other.code).toBe("VOICE_REFERENCE_ABSENT");
      expect(other.voiceId).not.toBe(VOICE_ID);
      expect(other.ttsReady).toBe(false);
    }
  });

  it("keeps speech recognition closed for empty, timed out, and real buffers", () => {
    expect(transcribe({ audio: Buffer.alloc(0), lang: "tr" }).code).toBe("EMPTY_AUDIO");
    expect(transcribe({ audio: Buffer.from([1, 2, 3]), lang: "ar", timeoutMs: 0 }).code).toBe("STT_TIMEOUT");
    for (const lang of ["tr", "de", "en", "ar"]) {
      const heard = transcribe({ audio: Buffer.from([1, 2, 3, 4]), lang });
      expect(heard.code).toBe("PROVIDER_ABSENT");
      expect(heard.transcript).toBeNull();
      expect(heard.sttReady).toBe(false);
      expect(heard.stored).toBe(false);
    }
    expect(transcribe({ audio: Buffer.from([1]), lang: "fr" }).code).toBe("LANGUAGE_SLOT_UNKNOWN");
  });

  it("routes a Pusat turn without speaking or mixing voices", () => {
    const routed = body.pusatRoute({ actorId: "pusat", profileKey: "sinan", lang: "tr", text: "durum" });
    expect(routed.spoke).toBe(false);
    expect(routed.speech).toBe("CLONE_DENIED");
    expect(routed.steps.map((step) => step.step)).toEqual(["capture", "stt", "select", "tts"]);
    expect(routed.voiceId).toBe(VOICE_ID);
    const mira = body.openSession({ actorId: "mira", profileKey: "mira", lang: "de" });
    expect(body.speak(mira.sessionId, { text: "katalog" }).voiceId).toBe(body.PROFILES.mira.voiceId);
    expect(body.changeProfile(mira.sessionId, { actorId: "mira", nextKey: "sinan" }).code).toBe("PROFILE_CHANGE_FORBIDDEN");
    expect(body.session(mira.sessionId).voiceId).not.toBe(VOICE_ID);
    expect(body.animate(routed.sessionId, "expression").rendered).toBe(false);
  });

  it("keeps commerce closed", () => {
    expect(isSalesEnabled()).toBe(false);
    expect(capturePayment({ actorId: "ninth" }).code).toBe("PAYMENT_NOT_LIVE");
    expect(new InterCarsAdapter().placeOrder({ actorId: "ninth" }).code).toBe("LIVE_ORDER_FORBIDDEN");
  });
});
