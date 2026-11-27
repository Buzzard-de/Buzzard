import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { VOICE_ID } = require("../lib/buzzardNative/speech/voiceIdentity");
const body = require("../lib/buzzardNative/engines/digitalBodySession");
const { capturePayment } = require("../lib/commerce/paymentService");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");
const { isSalesEnabled } = require("../lib/salesMode");

afterEach(() => body.clearSessions());

describe("eighth pass digital body", () => {
  it("keeps one engine and separate voice identities", () => {
    const keys = Object.keys(body.PROFILES);
    const voices = keys.map((key) => body.PROFILES[key].voiceId);
    expect(new Set(voices).size).toBe(keys.length);
    expect(body.PROFILES.sinan.voiceId).toBe(VOICE_ID);
    expect(body.PROFILES.sinan.agentId).not.toBe(body.PROFILES.mira.agentId);
    const sinan = body.voiceStatus("sinan");
    expect(sinan.ready).toBe(false);
    expect(sinan.ttsReady).toBe(false);
    expect(sinan.naturalSpeech).toBe(false);
    expect(body.voiceStatus("mira").code).toBe("VOICE_REFERENCE_ABSENT");
  });

  it("refuses a crossed profile and a missing language slot", () => {
    expect(body.openSession({ actorId: "mira", profileKey: "sinan" }).code).toBe("PROFILE_FORBIDDEN");
    expect(body.openSession({ actorId: "pusat", profileKey: "mira", lang: "fr" }).code).toBe("LANGUAGE_SLOT_UNKNOWN");
    const opened = body.openSession({ actorId: "pusat", profileKey: "mira", lang: "ar" });
    expect(opened.ok).toBe(true);
    expect(opened.voiceId).toBe(body.PROFILES.mira.voiceId);
    expect(opened.audio).toBe(false);
  });

  it("manages a speech session without producing audio", () => {
    const opened = body.openSession({ actorId: "sinan_bey", profileKey: "sinan", lang: "tr" });
    const said = body.speak(opened.sessionId, { text: "durum" });
    expect(said.code).toBe("CLONE_DENIED");
    expect(said.bytes).toBe(0);
    expect(said.voiceId).toBe(VOICE_ID);
    expect(body.hear(opened.sessionId).transcript).toBeNull();
    expect(body.interrupt(opened.sessionId, { actorId: "mira" }).code).toBe("PROFILE_FORBIDDEN");
    expect(body.interrupt(opened.sessionId, { actorId: "pusat" }).code).toBe("INTERRUPTED");
    expect(body.speak(opened.sessionId).code).toBe("SESSION_INTERRUPTED");
    expect(body.restart(opened.sessionId, { actorId: "pusat" }).code).toBe("RESTARTED");
    expect(body.speak(opened.sessionId).code).toBe("CLONE_DENIED");
  });

  it("blocks an unauthorized profile change and isolates a provider fault", () => {
    const opened = body.openSession({ actorId: "pusat", profileKey: "sinan", lang: "de" });
    const denied = body.changeProfile(opened.sessionId, { actorId: "mira", nextKey: "leon" });
    expect(denied.code).toBe("PROFILE_CHANGE_FORBIDDEN");
    expect(body.session(opened.sessionId).voiceId).toBe(VOICE_ID);
    const changed = body.changeProfile(opened.sessionId, { actorId: "pusat", nextKey: "leon", confirm: "PROFILE_CHANGE" });
    expect(changed.voiceId).toBe(body.PROFILES.leon.voiceId);
    expect(changed.voiceId).not.toBe(VOICE_ID);
    const fault = body.callProvider("tts", () => {
      throw new Error("provider down");
    });
    expect(fault.code).toBe("PROVIDER_FAULT");
    expect(fault.sessionAlive).toBe(true);
    expect(body.session(opened.sessionId).state).toBe("open");
    expect(body.animate(opened.sessionId, "lip_sync").rendered).toBe(false);
    expect(body.animate(opened.sessionId, "walk_sit").cssIsNotABody).toBe(true);
  });

  it("lets Pusat route a turn without speaking", () => {
    expect(body.pusatRoute({ actorId: "mira", profileKey: "mira" }).code).toBe("ORCHESTRATOR_REQUIRED");
    const routed = body.pusatRoute({ actorId: "pusat", profileKey: "amelia", lang: "en", text: "report" });
    expect(routed.routed).toBe(true);
    expect(routed.spoke).toBe(false);
    expect(routed.speech).toBe("VOICE_REFERENCE_ABSENT");
    expect(routed.voiceId).toBe(body.PROFILES.amelia.voiceId);
    const other = body.openSession({ actorId: "esat_bey", profileKey: "esat", lang: "de" });
    body.interrupt(routed.sessionId, { actorId: "pusat" });
    expect(body.session(other.sessionId).state).toBe("open");
  });

  it("keeps commerce closed", () => {
    expect(isSalesEnabled()).toBe(false);
    expect(capturePayment({ actorId: "eighth" }).code).toBe("PAYMENT_NOT_LIVE");
    expect(new InterCarsAdapter().placeOrder({ actorId: "eighth" }).code).toBe("LIVE_ORDER_FORBIDDEN");
  });
});
