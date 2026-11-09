import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { analyzeOfficialVoice, OFFICIAL_REL } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { protoSynth } = require("../lib/buzzardNative/speech/nativeTts.js");

describe("Sinan official voice reference", () => {
  it("registers the designated m4a without claiming TTS", () => {
    expect(existsSync(OFFICIAL_REL)).toBe(true);
    const a = analyzeOfficialVoice({ actorId: "sinan_bey" });
    expect(a.ok).toBe(true);
    expect(a.inventedHz).toBe(false);
    expect(a.ttsReady).toBe(false);
    expect(a.profile.f0Hz.mean).toBeCloseTo(170.8, 0);
    expect(a.profile.f0Hz.unit).toBe("Hz");
    expect(a.profile.durationSec).toBeGreaterThan(20);
    expect(a.profile.sampleRate).toBe(48000);
    expect(a.profile.cloneAuthorized).toBe(false);
    const buf = readFileSync(OFFICIAL_REL);
    expect(buf.length).toBe(401218);
    expect(protoSynth({ text: "test", lang: "tr" }).officialVoiceUsed).toBe(false);
  });
});
