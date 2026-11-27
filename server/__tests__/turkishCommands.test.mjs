import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { speakNatural, recognizeNatural } = require("../lib/voice/naturalSpeech.js");
const { openCouncilFloor, acceptHeardCommand } = require("../lib/voice/councilFloor.js");
const { presentSpeaker } = require("../lib/voice/meshAvatar.js");
const { memberAssetRegistry, validateMemberFile, voicePath } = require("../lib/voice/memberAssets.js");
const { cemStatus } = require("../lib/voice/turkishCatalog.js");

const COMMANDS = ["güvenlik durumu", "fiyat kontrol", "stok kontrol", "rapor sun", "toplantıyı başlat"];

function fold(value) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR").replace(/[.?!]+$/g, "");
}

describe("turkish command hearing", () => {
  it("keeps a misheard Antalia command from running and records every member file", () => {
    const rows = COMMANDS.map((expected) => {
      const said = speakNatural({ text: expected, lang: "tr", agentId: "esat_bey", turkish: true });
      expect(said.ok).toBe(true);
      expect(said.ownVoice).toBe(false);
      expect(said.modelFile).toBe("tr_TR-antalia-medium.onnx");
      expect(said.wav.readUInt32LE(24)).toBe(22050);
      expect(said.wav.readUInt16LE(22)).toBe(1);
      const heard = recognizeNatural({ wav: said.wav, lang: "tr", prompt: "", scores: true });
      return {
        expected,
        transcript: heard.transcript,
        code: heard.code,
        replaced: heard.replaced === true,
        accepted: heard.ok === true && fold(heard.transcript) === fold(expected),
        minTokenProbability: heard.minTokenProbability,
        model: heard.model,
      };
    });
    expect(rows.every((row) => row.replaced === false)).toBe(true);
    expect(rows.every((row) => row.model === "ggml-small.bin")).toBe(true);
    expect(rows.find((row) => row.expected === "güvenlik durumu").accepted).toBe(false);
    expect(rows.filter((row) => row.accepted)).toHaveLength(0);

    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-hear-")), "orch.sqlite");
    const floor = openCouncilFloor({ topic: "kurmay" });
    floor.join("suleyman_bey");
    const said = speakNatural({ text: "güvenlik durumu", lang: "tr", agentId: "esat_bey", turkish: true });
    const refused = floor.converse({ agentId: "esat_bey", wav: said.wav, dbPath });
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe("REPEAT_REQUIRED");
    expect(refused.executed).toBe(false);
    expect(refused.audio).toBe(false);
    expect(refused.purchased).toBe(false);
    expect(refused.heard.replaced).toBe(false);
    expect(fold(refused.heard.transcript)).not.toBe("güvenlik durumu");
    expect(floor.snapshot().transcript).toHaveLength(0);

    const registry = memberAssetRegistry();
    expect(registry).toHaveLength(17);
    expect(new Set(registry.map((row) => row.agentId)).size).toBe(17);
    expect(registry.every((row) => row.personalVoice === "BLOCKED_ASSET" && row.ownVoice === false && row.sharedVoice === "tr_TR-antalia-medium.onnx" && row.sharedIsPersonal === false)).toBe(true);
    expect(registry.every((row) => row.avatarAsset === "BLOCKED_ASSET" && row.previewMesh === true && row.realCharacter === false && row.digitalHuman === false)).toBe(true);
    expect(validateMemberFile({ agentId: "esat_bey", kind: "voice", filePath: voicePath("pusat") }).code).toBe("AGENT_MISMATCH");
    expect(validateMemberFile({ agentId: "esat_bey", kind: "voice", filePath: voicePath("esat_bey") }).code).toBe("BLOCKED_ASSET");

    const speaking = presentSpeaker({ agentId: "esat_bey", wav: said.wav, state: "speaking" });
    const listening = presentSpeaker({ agentId: "pusat", wav: null, state: "listening" });
    const idle = presentSpeaker({ agentId: "stock_ai", wav: null, state: "idle" });
    expect(speaking.lipSync).toBe(true);
    expect(speaking.peakJaw).toBeGreaterThan(0);
    expect(speaking.eyeOpen).toBe(1);
    expect(speaking.digitalHuman).toBe(false);
    expect(speaking.photoreal).toBe(false);
    expect(listening.peakJaw).toBe(0);
    expect(listening.lipSync).toBe(false);
    expect(listening.eyeOpen).toBe(0);
    expect(listening.headYaw).not.toBe(0);
    expect(idle.peakJaw).toBe(0);
    expect(idle.eyeOpen).toBe(1);
    expect(idle.headYaw).toBe(0);
    expect(cemStatus()).toMatchObject({ id: "cem", tokenPresent: false, downloaded: false, reason: "GATED_REPO", personal: false });
    expect(acceptHeardCommand("Güvenlik buyurumu.")).toBeNull();
    expect(acceptHeardCommand("Sıfık kaptı")).toBeNull();
    expect(acceptHeardCommand("Gel buraya sen.")).toBeNull();
    expect(acceptHeardCommand("Toplantıyı başlat.")).toBe("toplantıyı başlat");
  }, 120000);
});
