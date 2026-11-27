import { createRequire } from "node:module";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { speakCatalog } = require("../lib/voice/turkishCatalog.js");
const { recognizeNatural } = require("../lib/voice/naturalSpeech.js");
const { openCouncilFloor } = require("../lib/voice/councilFloor.js");
const { foldCommand, acceptHeardCommand, heardGate, COMMANDS } = require("../lib/voice/commandCatalog.js");
const { memberAssetRegistry, stageMemberAsset } = require("../lib/voice/memberAssets.js");
const { presentSpeaker } = require("../lib/voice/meshAvatar.js");
const { phoneStackStatus } = require("../lib/voice/sipLocal.js");
const { internetCallStatus } = require("../lib/voice/rtcMedia.js");
const { cemStatus } = require("../lib/voice/turkishCatalog.js");

const SPOKEN = [
  ...COMMANDS.map((command) => command.text),
  "merhaba nasılsın",
  "satın alma",
];

describe("command catalog and member files", () => {
  it("stores only a validated member file and keeps a rig from being a photoreal person", () => {
    const registry = memberAssetRegistry();
    expect(registry).toHaveLength(17);
    expect(registry.every((row) => row.personalVoice === "BLOCKED_ASSET" && row.avatarAsset === "BLOCKED_ASSET" && row.ownVoice === false)).toBe(true);
    const root = mkdtempSync(path.join(os.tmpdir(), "buzzard-asset-"));
    const empty = stageMemberAsset({ agentId: "esat_bey", kind: "voice", bytes: Buffer.alloc(64), root, license: "UNSTATED" });
    expect(empty).toMatchObject({ ok: false, stored: false, ownVoice: false });
    expect(stageMemberAsset({ agentId: "esat_bey", kind: "voice", bytes: Buffer.alloc(2048, 1), root }).code).toBe("LICENSE_REQUIRED");
    const voice = stageMemberAsset({ agentId: "esat_bey", kind: "voice", bytes: Buffer.alloc(2048, 8), root, license: "UNSTATED" });
    expect(voice).toMatchObject({ ok: true, ownVoice: false, personal: false, digitalHuman: false, sharedVoice: "tr_TR-antalia-medium.onnx" });
    expect(path.basename(voice.file)).toBe("esat_bey.onnx");
    const rig = {
      asset: { version: "2.0" },
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, targets: [{}] }], extras: { targetNames: ["jawOpen"] } }],
      skins: [{ joints: [0] }],
    };
    const rigFile = path.join(root, "esat_bey.gltf");
    writeFileSync(rigFile, JSON.stringify(rig));
    const speaking = presentSpeaker({ agentId: "esat_bey", wav: Buffer.alloc(4000, 1), state: "speaking", gltfPath: rigFile });
    const listening = presentSpeaker({ agentId: "pusat", wav: null, state: "listening", gltfPath: rigFile });
    expect(speaking.rigReady).toBe(true);
    expect(speaking.lipSyncTarget).toBe("AVATAR_MORPH");
    expect(speaking.channels.jaw).toBeGreaterThan(0);
    expect(speaking.channels.body).toBe(0);
    expect(speaking.digitalHuman).toBe(false);
    expect(speaking.photoreal).toBe(false);
    expect(speaking.realCharacter).toBe(false);
    expect(listening.channels.jaw).toBe(0);
    expect(listening.channels.eyes).toBe(1);
    expect(phoneStackStatus()).toMatchObject({ phoneLine: "BLOCKED_EXTERNAL", operatorAccount: false, freeswitchInstalled: false });
    expect(internetCallStatus()).toMatchObject({ status: "BLOCKED_EXTERNAL", verified: false, internet: false });
    expect(cemStatus()).toMatchObject({ downloaded: false, tokenPresent: false, reason: "GATED_REPO" });
    expect(existsSync(path.join(root, "speech", "members", "pusat.onnx"))).toBe(false);
  });

  async function hear(expected) {
    await new Promise((resolve) => setImmediate(resolve));
    const said = speakCatalog({ speaker: "emre", text: expected });
    expect(said.personal).toBe(false);
    expect(said.productVoice).toBe(false);
    const heard = recognizeNatural({ wav: said.wav, lang: "tr", prompt: "", scores: false });
    return { expected, transcript: heard.transcript, replaced: heard.replaced === true, wav: said.wav };
  }

  it("hears the first half of the catalog without rewriting it", async () => {
    const rows = [];
    for (const expected of SPOKEN.slice(0, 9)) rows.push(await hear(expected));
    expect(rows.every((row) => row.replaced === false && row.transcript)).toBe(true);
    expect(rows.some((row) => foldCommand(row.transcript) === foldCommand(row.expected))).toBe(true);
    rows.forEach((row) => {
      const same = foldCommand(row.transcript) === foldCommand(row.expected);
      const accepted = acceptHeardCommand(row.transcript);
      if (same && COMMANDS.some((command) => command.text === row.expected)) expect(accepted).toBe(row.expected);
      else expect(accepted).toBeNull();
    });
    const price = rows.find((row) => row.expected === "fiyat kontrol");
    if (foldCommand(price.transcript) !== "fiyat kontrol") expect(acceptHeardCommand(price.transcript)).toBeNull();
  }, 90000);

  it("hears the rest of the catalog and routes an exact security command", async () => {
    const rows = [];
    for (const expected of SPOKEN.slice(9)) rows.push(await hear(expected));
    expect(rows.every((row) => row.replaced === false && row.transcript)).toBe(true);
    expect(rows.some((row) => foldCommand(row.transcript) === foldCommand(row.expected))).toBe(true);
    const security = await hear("güvenlik durumu");
    expect(foldCommand(security.transcript)).toBe("güvenlik durumu");
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-")), "orch.sqlite");
    const floor = openCouncilFloor({ topic: "kurmay" });
    floor.join("suleyman_bey");
    const routed = floor.converse({ agentId: "esat_bey", wav: security.wav, dbPath });
    expect(foldCommand(routed.heard.transcript)).toBe("güvenlik durumu");
    expect(routed).toMatchObject({ ok: true, code: "VOICE_CHAIN", agentId: "esat_bey", purchased: false, ownVoice: false });
    expect(floor.snapshot().transcript).toHaveLength(0);
    expect(acceptHeardCommand("Fiat Control.")).toBeNull();
    expect(acceptHeardCommand("Stock Control")).toBeNull();
    expect(heardGate("satın alma")).toBe("HUMAN_GATE_REQUIRED");
    expect(heardGate("satışı aç")).toBe("SALES_LOCKED");
  }, 90000);
});
