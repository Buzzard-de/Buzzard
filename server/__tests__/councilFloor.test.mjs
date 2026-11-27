import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { openCouncilFloor } = require("../lib/voice/councilFloor.js");
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");
const { canUse } = require("../lib/buzzardNative/core/capabilityRegistry.js");

describe("council floor", () => {
  it("runs the seventeen member floor on one shared engine", () => {
    const floor = openCouncilFloor({ topic: "kurmay" });
    expect(floor.ok).toBe(true);
    expect(floor.join("suleyman_bey")).toMatchObject({ ok: true, joined: true, member: false });
    expect(floor.join("pusat").code).toBe("USER_REQUIRED");
    expect(floor.run({ faultAgent: "esat_bey" }).ok).toBe(true);
    const view = floor.snapshot();
    expect(view.engine).toBe("digital_body");
    expect(view.engines).toBe(1);
    expect(view.seats.map((seat) => seat.agentId)).toEqual(ids());
    const speakers = ids().filter((id) => canUse(id, "speech"));
    expect(speakers).toHaveLength(12);
    const audio = view.turns.filter((turn) => turn.audio);
    expect(audio).toHaveLength(11);
    expect(audio.every((turn) => turn.ownVoice === false && turn.sharedVoice === true && turn.personalVoice === "BLOCKED_ASSET" && turn.modelFile === "tr_TR-antalia-medium.onnx")).toBe(true);
    expect(audio.every((turn) => turn.onlySpeaker === true && turn.lipSync === true && turn.peakJaw > 0 && turn.listenerJaw === 0 && turn.previewMesh === true && turn.realCharacter === false && turn.digitalHuman === false && turn.assetStatus === "BLOCKED_ASSET")).toBe(true);
    expect(new Set(audio.map((turn) => turn.agentId)).size).toBe(11);
    expect(new Set(audio.map((turn) => turn.sha256)).size).toBe(11);
    expect(view.turns.find((turn) => turn.agentId === "esat_bey")).toMatchObject({ audio: false, error: "MEMBER_FAILED" });
    expect(view.turns.filter((turn) => turn.speech === false).map((turn) => turn.agentId).sort()).toEqual([
      "category_ai",
      "pricing_ai",
      "sales_analysis_ai",
      "seo_ai",
      "stock_ai",
    ]);
    expect(view.seats.filter((seat) => seat.speech !== true).every((seat) => seat.pose === "idle" && seat.peakJaw === 0 && seat.lipSync === false)).toBe(true);
    expect(view.seats.filter((seat) => seat.speech === true).every((seat) => seat.pose === "listening" && seat.lipSync === false)).toBe(true);
    expect(view.seats.every((seat) => seat.heard.length === view.transcript.length)).toBe(true);
    const call = floor.privateCall({ agentId: "pusat", text: "Ankara rapor sunar.", hear: true });
    expect(call).toMatchObject({
      ok: true,
      code: "PRIVATE_LOCAL",
      audio: true,
      ownVoice: false,
      sharedVoice: true,
      personalVoice: "BLOCKED_ASSET",
      carrier: false,
      internet: false,
      phoneLine: "BLOCKED_EXTERNAL",
      alone: true,
      digitalHuman: false,
      realCharacter: false,
      previewMesh: true,
      participants: ["suleyman_bey", "pusat"],
    });
    expect(call.heard.replaced).toBe(false);
    expect(call.heard.paid).toBe(false);
    expect(["NATURAL_STT", "STT_FAILED", "NATURAL_SPEECH_NOT_CONFIGURED"]).toContain(call.heard.code);
    const denied = floor.privateCall({ agentId: "stock_ai", text: "Stok." });
    expect(denied).toMatchObject({ ok: false, code: "SPEECH_DENIED", audio: false, carrier: false, phoneLine: "BLOCKED_EXTERNAL" });
    const summary = floor.close();
    expect(summary).toMatchObject({
      ok: true,
      chair: "pusat",
      members: 17,
      spoken: 11,
      reports: 11,
      followed: true,
      salesEnabled: false,
      personalVoices: "BLOCKED_ASSET",
      characters: "BLOCKED_ASSET",
      sharedEngine: "digital_body",
      engines: 1,
      digitalHuman: false,
      photoreal: false,
      realCharacter: false,
      carrier: false,
      internet: false,
      paid: false,
      faults: [{ agentId: "esat_bey", error: "MEMBER_FAILED" }],
    });
    expect(summary.user.userId).toBe("suleyman_bey");
    expect(summary.silent.sort()).toEqual(["category_ai", "pricing_ai", "sales_analysis_ai", "seo_ai", "stock_ai"]);
  }, 180000);
});
