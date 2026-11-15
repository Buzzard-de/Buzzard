import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { reportVoiceProfiles, SINAN_FILE } = require("../lib/buzzardNative/core/voiceProfiles.js");
const { SEED_IDS, getAgentExact } = require("../lib/buzzardNative/core/identityRegistry.js");
const { speak } = require("../lib/buzzardNative/core/sharedSpeech.js");
const { createSpeechEngine } = require("../lib/buzzardNative/engines/speech.js");
const { EXPECTED_SHA } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { providerAdapters } = require("../lib/voice/councilVoice.js");

describe("17 voice profiles and local voice infrastructure", () => {
  it("keeps Sinan's reference and leaves the other profiles unconfigured", () => {
    const before = getAgentExact("sinan_bey").voice_profile;
    const report = reportVoiceProfiles();
    expect(report.rosterComplete).toBe(true);
    expect(report.ids).toEqual([...SEED_IDS]);
    expect(report.sinanPreserved).toBe(true);
    expect(report.recordingRewritten).toBe(false);
    expect(report.callPlaced).toBe(false);
    expect(report.serviceConnected).toBe(false);
    expect(report.productionReady).toBe(false);
    const sinan = report.profiles.find((profile) => profile.id === "sinan_bey");
    expect(sinan.status).toBe("REFERENCE_REGISTERED");
    expect(sinan.officialSinan).toBe(true);
    expect(sinan.referenceFile).toBe(SINAN_FILE);
    expect(sinan.cloneAuthorized).toBe(false);
    expect(sinan.ttsReady).toBe(false);
    expect(sinan.live).toBe(false);
    expect(sinan.serviceConnected).toBe(false);
    expect(getAgentExact("sinan_bey").voice_profile).toEqual(before);
    for (const profile of report.profiles.filter((row) => row.id !== "sinan_bey")) {
      expect(profile.status).toBe("NOT_CONFIGURED");
      expect(profile.officialSinan).toBe(false);
      expect(profile.referenceFile).toBe(null);
      expect(profile.ready).toBe(false);
      expect(profile.live).toBe(false);
      expect(profile.ttsReady).toBe(false);
      expect(profile.serviceConnected).toBe(false);
    }
  });

  it("separates local code from STT, TTS, WebRTC, TURN/STUN, and phone connections", () => {
    const adapters = providerAdapters();
    const byId = Object.fromEntries(adapters.map((row) => [row.id, row]));
    for (const id of ["stt", "tts", "webrtc", "stun_turn", "phone"]) {
      expect(byId[id].serviceConnected).toBe(false);
      expect(byId[id].live).toBe(false);
      expect(byId[id].credentialInvented).toBe(false);
      expect(["NOT_CONFIGURED", "UNKNOWN", "BLOCKED"]).toContain(byId[id].status);
    }
    expect(byId.stt.codePresent).toBe(true);
    expect(byId.tts.codePresent).toBe(true);
    expect(byId.webrtc.codePresent).toBe(true);
    expect(byId.stun_turn.codePresent).toBe(false);
    expect(byId.phone.codePresent).toBe(true);
    expect(byId.stt.status).not.toBe("CODE_READY");
    expect(byId.webrtc.status).not.toBe("CODE_READY");
    expect(new Set(adapters.map((row) => row.id)).size).toBe(adapters.length);
  });

  it("does not synthesize a character voice for an unconfigured profile", () => {
    const amelia = speak({ agentId: "amelia", text: "a" });
    expect(amelia.ok).toBe(false);
    expect(amelia.code).toBe("VOICE_NOT_CONFIGURED");
    expect(amelia.voiceStatus).toBe("NOT_CONFIGURED");
    expect(amelia.audioProduced).toBe(false);
    expect(amelia.serviceConnected).toBe(false);
    const sinan = speak({ agentId: "sinan_bey", text: "a" });
    expect(sinan.voiceStatus).toBe("REFERENCE_REGISTERED");
    expect(sinan.officialVoiceUsed).toBe(false);
    expect(sinan.serviceConnected).toBe(false);
    expect(sinan.ttsReady).toBe(false);
    const speech = createSpeechEngine();
    speech.initialize();
    const other = speech.execute({ op: "identity", memberId: "banu_hanim" });
    expect(other.known).toBe(false);
    expect(other.status).toBe("NOT_CONFIGURED");
    expect(other.liveTts).toBe(false);
    const official = speech.execute({ op: "verify_official" });
    expect(official.sha256).toBe(EXPECTED_SHA);
    expect(official.unchanged).toBe(true);
  });
});
